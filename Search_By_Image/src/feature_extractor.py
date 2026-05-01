# src/feature_extractor.py
"""
Handles ResNet50 model initialization, image preprocessing,
and batch feature extraction with L2 normalization.
"""

import logging
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision import models, transforms

from config import IMAGES_DIR, EMBEDDING_DIM, BATCH_SIZE

logger = logging.getLogger("scraper")

# ── ImageNet preprocessing (must match the training statistics) ──────
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def build_model(device: torch.device) -> torch.nn.Module:
    """
    Loads a pre-trained ResNet50 and strips the final FC layer so that
    forward() returns a 2048-d embedding instead of 1000-class logits.
    """
    resnet = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)

    # Remove the last fully-connected classification layer.
    # nn.Identity() acts as a pass-through, giving us the raw pool output.
    resnet.fc = torch.nn.Identity()

    resnet = resnet.to(device)
    resnet.eval()
    return resnet


def load_and_preprocess(image_path: Path) -> torch.Tensor | None:
    """
    Opens a single image, converts it to RGB, and applies the ImageNet
    transform pipeline.  Returns None for corrupt / unreadable files.
    """
    try:
        img = Image.open(image_path).convert("RGB")
        return preprocess(img)
    except Exception as e:
        logger.warning(f"Skipping {image_path.name}: {e}")
        return None


def extract_features(
    images_dir: Path = IMAGES_DIR,
    batch_size: int = BATCH_SIZE,
) -> tuple[np.ndarray, list[str]]:
    """
    Iterates over every *.jpg in `images_dir`, extracts 2048-d embeddings
    via ResNet50, L2-normalizes them, and returns:

        embeddings  – float32 array of shape (N, 2048), L2-normalized
        string_ids  – list of N strings, each being the filename stem
                      (e.g. "6AEECB5D-4EF5-4DBE-A9AB-B0931731FA6A")
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    model = build_model(device)

    # Discover all .jpg images, sorted alphabetically by stem
    image_paths: list[Path] = sorted(
        images_dir.glob("*.jpg"),
        key=lambda p: p.stem,
    )
    if not image_paths:
        raise FileNotFoundError(f"No .jpg images found in {images_dir}")

    logger.info(f"Found {len(image_paths)} images in {images_dir}")

    all_embeddings: list[np.ndarray] = []
    all_ids: list[str] = []

    # Process in batches to avoid OOM on large datasets
    for batch_start in range(0, len(image_paths), batch_size):
        batch_paths = image_paths[batch_start : batch_start + batch_size]
        tensors: list[torch.Tensor] = []
        batch_ids: list[str] = []

        for p in batch_paths:
            tensor = load_and_preprocess(p)
            if tensor is not None:
                tensors.append(tensor)
                batch_ids.append(p.stem)  # keep the original string ID

        if not tensors:
            continue

        batch_tensor = torch.stack(tensors).to(device)

        with torch.no_grad():
            features = model(batch_tensor)          # (B, 2048)

        features_np = features.cpu().numpy().astype(np.float32)

        # L2-normalize so FAISS Inner Product == Cosine Similarity
        norms = np.linalg.norm(features_np, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10  # guard against zero-vectors
        features_np = features_np / norms

        all_embeddings.append(features_np)
        all_ids.extend(batch_ids)

        processed = batch_start + len(batch_paths)
        logger.info(
            f"Extracted features: {processed}/{len(image_paths)} images"
        )

    embeddings = np.vstack(all_embeddings)                      # (N, 2048)

    logger.info(
        f"Feature extraction complete. "
        f"Embeddings shape: {embeddings.shape}, IDs count: {len(all_ids)}"
    )
    return embeddings, all_ids
