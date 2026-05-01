# src/build_index.py
"""
Entry point for the feature-extraction → FAISS-indexing pipeline.

Usage:
    python src/build_index.py                    # process all images
    python src/build_index.py --batch-size 32    # smaller batches (less RAM)
"""

import argparse
import logging
import sys
import time
from pathlib import Path

from config import IMAGES_DIR, FAISS_INDEX_PATH, ID_MAP_PATH, BATCH_SIZE
from feature_extractor import extract_features
from faiss_indexer import build_index, save_index

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("scraper")


def main():
    parser = argparse.ArgumentParser(
        description="Extract ResNet50 features and build a FAISS index"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=BATCH_SIZE,
        help=f"Images per forward pass (default: {BATCH_SIZE})",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(FAISS_INDEX_PATH),
        help=f"Where to save the .faiss file (default: {FAISS_INDEX_PATH})",
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("  Property Vision Index — Build Pipeline")
    logger.info("=" * 60)

    # ── Step 1: Feature extraction ───────────────────────────────────
    t0 = time.time()
    try:
        embeddings, string_ids = extract_features(
            images_dir=IMAGES_DIR,
            batch_size=args.batch_size,
        )
    except FileNotFoundError as e:
        logger.error(str(e))
        sys.exit(1)

    t_extract = time.time() - t0
    logger.info(f"Feature extraction took {t_extract:.1f}s")

    # ── Step 2: Build FAISS index ────────────────────────────────────
    t1 = time.time()
    index, id_map = build_index(embeddings, string_ids)
    t_index = time.time() - t1
    logger.info(f"Index construction took {t_index:.1f}s")

    # ── Step 3: Save to disk ─────────────────────────────────────────
    output_path = Path(args.output)
    save_index(index, id_map, index_path=output_path)

    logger.info(
        f"Pipeline complete in {time.time() - t0:.1f}s — "
        f"{len(string_ids)} images indexed."
    )


if __name__ == "__main__":
    main()
