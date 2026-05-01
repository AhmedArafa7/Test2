# src/config.py

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGES_DIR = BASE_DIR / "images"
LOGS_DIR = BASE_DIR / "logs"

# File paths
INPUT_CSV = BASE_DIR / "egypt_real_estate_preprocessed_analysis-and-segmentation.csv"
OUTPUT_CSV = DATA_DIR / "updated_properties.csv"
LOG_FILE = LOGS_DIR / "failed_downloads.log"

# Scraper Settings
MIN_DELAY_SEC = 2.0
MAX_DELAY_SEC = 4.0
PAGE_LOAD_TIMEOUT = 30
IMAGE_DOWNLOAD_TIMEOUT = 15

# Used for the direct requests call when downloading the CDN image
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# ── Feature Extraction & FAISS Settings ──────────────────────────────
FAISS_INDEX_PATH = DATA_DIR / "property_vision_index.faiss"
ID_MAP_PATH = DATA_DIR / "faiss_id_mapping.json"  # int → string ID lookup
EMBEDDING_DIM = 2048          # ResNet50 penultimate layer output
BATCH_SIZE = 64               # Images per forward pass (tune to your GPU/RAM)
