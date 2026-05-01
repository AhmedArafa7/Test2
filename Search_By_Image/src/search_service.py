# src/search_service.py
"""
Core logic for image-based property similarity search.
Handles ResNet50 inference, L2 normalization, and FAISS filtered search.
"""

import json
import logging
from io import BytesIO
from pathlib import Path

import faiss
import numpy as np
import torch
from PIL import Image

from config import FAISS_INDEX_PATH, ID_MAP_PATH, EMBEDDING_DIM
from feature_extractor import build_model, preprocess

logger = logging.getLogger("scraper")


class SearchService:
    """
    Singleton-style service loaded once at startup.
    Holds the FAISS index, ID mappings, and the ResNet50 model in memory.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"SearchService using device: {self.device}")

        # ── Load ResNet50 (headless) ─────────────────────────────────
        self.model = build_model(self.device)

        # ── Load FAISS index ─────────────────────────────────────────
        if not FAISS_INDEX_PATH.exists():
            raise FileNotFoundError(f"FAISS index not found at {FAISS_INDEX_PATH}")
        self.index = faiss.read_index(str(FAISS_INDEX_PATH))
        logger.info(f"FAISS index loaded: {self.index.ntotal} vectors")

        # ── Load ID mapping (int → string UUID) ─────────────────────
        if not ID_MAP_PATH.exists():
            raise FileNotFoundError(f"ID mapping not found at {ID_MAP_PATH}")
        with open(ID_MAP_PATH) as f:
            self.int_to_str: dict[int, str] = {
                int(k): v for k, v in json.load(f).items()
            }

        # Build the reverse map: string UUID → FAISS int ID
        self.str_to_int: dict[str, int] = {
            v: k for k, v in self.int_to_str.items()
        }
        logger.info(f"ID mappings loaded: {len(self.int_to_str)} entries")

    # ── Public API ───────────────────────────────────────────────────

    def extract_query_vector(self, image_bytes: bytes) -> np.ndarray:
        """
        Transforms raw image bytes into a single L2-normalized 2048-d vector.
        Raises ValueError on corrupt / unreadable images.
        """
        try:
            img = Image.open(BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Cannot decode image: {e}")

        tensor = preprocess(img).unsqueeze(0).to(self.device)  # (1, 3, 224, 224)

        with torch.no_grad():
            features = self.model(tensor)  # (1, 2048)

        vec = features.cpu().numpy().astype(np.float32)

        # L2-normalize (same as during indexing)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return vec  # shape (1, 2048)

    def search(
        self,
        query_vec: np.ndarray,
        valid_ids: list[str],
        k: int = 5,
    ) -> list[dict]:
        """
        Searches the FAISS index restricted to `valid_ids` (UUID strings).

        Returns a list of dicts sorted by descending similarity:
            [{"property_id": "ABC-...", "similarity_score": 0.87}, ...]
        """
        # Map incoming UUID strings → FAISS int IDs
        faiss_int_ids = []
        for sid in valid_ids:
            # Case-insensitive lookup to handle mixed casing from .NET
            upper = sid.upper()
            if upper in self.str_to_int:
                faiss_int_ids.append(self.str_to_int[upper])

        if not faiss_int_ids:
            return []

        # Clamp k to the number of available candidates
        effective_k = min(k, len(faiss_int_ids))

        # Build FAISS ID selector to restrict search
        id_array = np.array(faiss_int_ids, dtype=np.int64)
        selector = faiss.IDSelectorBatch(id_array)
        params = faiss.SearchParametersIVF() if hasattr(faiss, "SearchParametersIVF") else faiss.SearchParameters()
        params.sel = selector

        # Run the filtered search
        scores, indices = self.index.search(
            query_vec, effective_k, params=params
        )

        # Build response
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue  # no match found
            string_id = self.int_to_str.get(int(idx))
            if string_id:
                results.append({
                    "property_id": string_id,
                    "similarity_score": round(float(score), 6),
                })

        # Already sorted by FAISS (highest IP first), but be explicit
        results.sort(key=lambda r: r["similarity_score"], reverse=True)
        return results
