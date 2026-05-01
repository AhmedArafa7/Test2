# src/faiss_indexer.py
"""
Builds and persists a FAISS index from pre-computed embeddings.

Uses IndexIDMap(IndexFlatIP) so that:
  • Inner-product search on L2-normalized vectors ≡ cosine similarity.
  • Each vector is stored with a sequential int64 key.

Because the original image IDs are strings (UUIDs), we maintain a
separate JSON mapping file:  int_id → string_id.
This lets us translate FAISS search results back to the real identifiers.
"""

import json
import logging
from pathlib import Path

import faiss
import numpy as np

from config import FAISS_INDEX_PATH, EMBEDDING_DIM, ID_MAP_PATH

logger = logging.getLogger("scraper")


def build_index(
    embeddings: np.ndarray,
    string_ids: list[str],
) -> tuple[faiss.IndexIDMap, dict[int, str]]:
    """
    Creates a FAISS IndexIDMap wrapping IndexFlatIP and populates it.

    Since FAISS only accepts int64 IDs, we assign each string ID a
    sequential integer and return the mapping alongside the index.

    Parameters
    ----------
    embeddings : np.ndarray, shape (N, 2048), dtype float32, L2-normalized
    string_ids : list[str], length N

    Returns
    -------
    index      – faiss.IndexIDMap, ready for search or serialisation
    id_map     – dict mapping int64 FAISS key → original string ID
    """
    assert embeddings.ndim == 2 and embeddings.shape[1] == EMBEDDING_DIM, (
        f"Expected embeddings of shape (N, {EMBEDDING_DIM}), "
        f"got {embeddings.shape}"
    )
    assert len(embeddings) == len(string_ids), (
        f"Mismatch: {len(embeddings)} embeddings vs {len(string_ids)} IDs"
    )

    # Inner Product on L2-normalized vectors == Cosine Similarity
    flat_index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index = faiss.IndexIDMap(flat_index)

    # Build the int → string mapping
    int_ids = np.arange(len(string_ids), dtype=np.int64)
    id_map = {int(i): sid for i, sid in zip(int_ids, string_ids)}

    index.add_with_ids(embeddings, int_ids)

    logger.info(
        f"FAISS index built: {index.ntotal} vectors, dim={EMBEDDING_DIM}"
    )
    return index, id_map


def save_index(
    index: faiss.IndexIDMap,
    id_map: dict[int, str],
    index_path: Path = FAISS_INDEX_PATH,
    map_path: Path = ID_MAP_PATH,
) -> None:
    """Writes the FAISS index and the ID mapping to disk."""
    index_path.parent.mkdir(parents=True, exist_ok=True)

    faiss.write_index(index, str(index_path))
    logger.info(f"FAISS index saved to {index_path}")

    with open(map_path, "w") as f:
        json.dump(id_map, f)
    logger.info(f"ID mapping saved to {map_path} ({len(id_map)} entries)")


def load_index(
    index_path: Path = FAISS_INDEX_PATH,
    map_path: Path = ID_MAP_PATH,
) -> tuple[faiss.IndexIDMap, dict[int, str]]:
    """Loads a previously-saved FAISS index and its ID mapping from disk."""
    if not index_path.exists():
        raise FileNotFoundError(f"No FAISS index at {index_path}")
    if not map_path.exists():
        raise FileNotFoundError(f"No ID mapping at {map_path}")

    index = faiss.read_index(str(index_path))
    with open(map_path) as f:
        id_map = {int(k): v for k, v in json.load(f).items()}

    logger.info(f"FAISS index loaded: {index.ntotal} vectors, {len(id_map)} mapped IDs")
    return index, id_map
