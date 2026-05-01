# src/file_handler.py

import logging
import os
from config import LOG_FILE


def setup_logging():
    """Configure logging to write to both console and log file."""
    logger = logging.getLogger("scraper")
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers on re-runs
    if logger.handlers:
        return logger

    # File handler — errors only
    if not os.path.exists(LOG_FILE.parent):
        os.makedirs(LOG_FILE.parent)

    fh = logging.FileHandler(LOG_FILE)
    fh.setLevel(logging.ERROR)

    # Console handler — all info
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)

    # Format
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)

    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger


def save_image(image_bytes, save_path):
    """Write raw image bytes to disk."""
    with open(save_path, "wb") as f:
        f.write(image_bytes)


def log_failure(logger, index, url, error):
    """Log a failed download with row index and URL."""
    logger.error(f"Row {index} | URL: {url} | Error: {str(error)}")
