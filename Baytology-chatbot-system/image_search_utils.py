"""
Image search utilities for Baytology.

This module provides a deterministic visual-similarity baseline for uploaded
property images. It compares the query image with property image URLs using
compact color, contrast, shape, and edge features. The public API can later be
upgraded to CLIP or a hosted vision model without changing the .NET gateway
contract.
"""

from __future__ import annotations

import io
import math
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests
from PIL import Image, ImageFilter, ImageStat, UnidentifiedImageError

from config import settings
from search_engine.data_sources import load_property_data


SUPPORTED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
}

IMAGE_URL_COLUMNS = (
    "image_url",
    "primary_image_url",
    "main_image_url",
    "thumbnail_url",
    "photo_url",
    "image",
)

IMAGE_URL_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif")

_feature_cache: dict[str, list[float]] = {}


def search_by_image(
    image_bytes: bytes,
    mime_type: str,
    top_n: int = 10,
    filters: dict | None = None,
) -> dict:
    """
    Search for visually similar properties.
    """
    if not image_bytes:
        raise ValueError("Empty image file")

    safe_top_n = max(1, min(int(top_n or 10), 50))
    normalized_type = validate_image_type(mime_type)
    query_features = extract_image_features(image_bytes)

    properties = load_property_data(filters or {})
    if properties.empty:
        return _build_response(normalized_type, image_bytes, [], "No properties found.")

    max_candidates = max(1, settings.image_search_max_candidates)
    candidates = []

    for _, row in properties.head(max_candidates).iterrows():
        best_score = None
        best_image_url = None

        for image_url in _get_image_urls(row):
            candidate_features = _get_image_features_for_url(image_url)
            if candidate_features is None:
                continue

            score = _cosine_similarity(query_features, candidate_features)
            if best_score is None or score > best_score:
                best_score = score
                best_image_url = image_url

        if best_score is None:
            continue

        record = _row_to_record(row)
        record["image_url"] = best_image_url
        record["visual_similarity_score"] = round(best_score, 6)
        record["visual_similarity_engine"] = "visual_similarity_v1"
        candidates.append(record)

    candidates.sort(key=lambda item: item["visual_similarity_score"], reverse=True)
    results = candidates[:safe_top_n]

    message = (
        f"Found {len(results)} visually similar properties."
        if results
        else "No searchable property images found."
    )
    return _build_response(normalized_type, image_bytes, results, message)


def validate_image_type(content_type: str | None) -> str:
    """
    Validate and normalize an uploaded image MIME type.
    """
    if not content_type:
        return "image/jpeg"

    base_type = content_type.lower().split(";")[0].strip()
    if base_type in SUPPORTED_IMAGE_TYPES:
        return base_type

    supported = ", ".join(sorted(SUPPORTED_IMAGE_TYPES))
    raise ValueError(
        f"Unsupported image type: '{content_type}'. Supported types: {supported}"
    )


def extract_image_features(image_bytes: bytes) -> list[float]:
    """
    Extract compact normalized visual features from an image.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            width, height = image.size
            rgb = image.convert("RGB")
            resized = rgb.resize((128, 128))

            features: list[float] = []
            histogram = resized.histogram()

            for channel in range(3):
                channel_hist = histogram[channel * 256 : (channel + 1) * 256]
                for index in range(0, 256, 16):
                    features.append(sum(channel_hist[index : index + 16]))

            total_pixels = 128 * 128
            features = [value / total_pixels for value in features]

            grayscale = resized.convert("L")
            grayscale_stat = ImageStat.Stat(grayscale)
            edge_stat = ImageStat.Stat(grayscale.filter(ImageFilter.FIND_EDGES))

            aspect_ratio = width / height if height else 1.0
            features.extend(
                [
                    min(aspect_ratio, 4.0) / 4.0,
                    min(1 / aspect_ratio if aspect_ratio else 1.0, 4.0) / 4.0,
                    grayscale_stat.mean[0] / 255.0,
                    grayscale_stat.stddev[0] / 128.0,
                    edge_stat.mean[0] / 255.0,
                ]
            )

            return _normalize(features)
    except UnidentifiedImageError as exc:
        raise ValueError("Uploaded file is not a valid image.") from exc


def _get_image_features_for_url(image_url: str) -> list[float] | None:
    if image_url in _feature_cache:
        return _feature_cache[image_url]

    image_bytes = _read_image_bytes(image_url)
    if image_bytes is None:
        return None

    try:
        features = extract_image_features(image_bytes)
    except ValueError:
        return None

    _feature_cache[image_url] = features
    return features


def _read_image_bytes(image_url: str) -> bytes | None:
    parsed = urlparse(image_url)

    try:
        if parsed.scheme in {"http", "https"}:
            response = requests.get(
                image_url,
                timeout=settings.image_search_request_timeout_seconds,
            )
            response.raise_for_status()
            return response.content

        path = Path(parsed.path if parsed.scheme == "file" else image_url)
        if path.exists() and path.is_file():
            return path.read_bytes()
    except Exception as exc:
        print(f"[IMAGE] Failed to load property image '{image_url}': {exc}")

    return None


def _get_image_urls(row: pd.Series) -> list[str]:
    urls: list[str] = []

    for column in IMAGE_URL_COLUMNS:
        if column not in row.index:
            continue

        value = row.get(column)
        if value is None:
            continue

        if isinstance(value, str):
            urls.extend(part.strip() for part in value.split(","))
        elif isinstance(value, (list, tuple, set)):
            urls.extend(str(item).strip() for item in value)
        elif not pd.isna(value):
            urls.append(str(value).strip())

    return [url for url in urls if _looks_like_image_url(url)]


def _looks_like_image_url(value: str) -> bool:
    if not value:
        return False

    parsed = urlparse(value)
    path = parsed.path.lower()
    return path.endswith(IMAGE_URL_EXTENSIONS)


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def _normalize(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in values))
    if norm == 0:
        return values
    return [value / norm for value in values]


def _row_to_record(row: pd.Series) -> dict:
    record = {}
    for key, value in row.to_dict().items():
        if value is None:
            record[key] = None
        elif isinstance(value, (list, tuple, set)):
            record[key] = list(value)
        elif _is_missing(value):
            record[key] = None
        elif hasattr(value, "item"):
            record[key] = value.item()
        else:
            record[key] = value
    return record


def _is_missing(value: object) -> bool:
    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def _build_response(
    mime_type: str,
    image_bytes: bytes,
    properties: list[dict],
    message: str,
) -> dict:
    return {
        "count": len(properties),
        "properties": properties,
        "message": message,
        "engine": "visual_similarity_v1",
        "query_image": {
            "content_type": mime_type,
            "size_bytes": len(image_bytes),
        },
    }
