"""
Baytology: Real Estate Recommendation API
-----------------------------------------
A high-performance FastAPI service that uses FAISS (Facebook AI Similarity Search)
to provide instant property recommendations based on numerical similarity.

Endpoints:
- GET /: Health check and service status.
- GET /recommend/{id}: Returns N similar properties for a given property ID.
"""

import os
import json
import logging
import subprocess
import sys
import threading
import time
import faiss
import pandas as pd
import numpy as np
import httpx
import pika
from fastapi import FastAPI, HTTPException, Query
from contextlib import asynccontextmanager

from config import settings

logger = logging.getLogger("baytology.recommendation.worker")


class RetryableWorkerError(RuntimeError):
    """Raised when a queue message should be retried."""


class PermanentWorkerError(RuntimeError):
    """Raised when retrying the queue message would not help."""

# --- Global Resource Storage ---
# Stores the index and dataframes in memory to avoid redundant disk I/O.
resources = {
    "index": None,
    "master_df": None,
    "feature_vectors": None
}


class RecommendationQueueWorker:
    def __init__(self):
        self._stop_event = threading.Event()
        self._thread = None
        self._connection = None
        self._channel = None

    def start(self):
        if not settings.worker_enabled or not settings.rabbitmq_enabled:
            logger.info("Recommendation queue worker is disabled by configuration.")
            return

        if not settings.dotnet_ai_service_token:
            logger.warning("Recommendation queue worker did not start because DOTNET_AI_SERVICE_TOKEN is missing.")
            return

        if resources["index"] is None or resources["master_df"] is None or resources["feature_vectors"] is None:
            logger.warning("Recommendation queue worker did not start because model artifacts are not loaded.")
            return

        if self._thread and self._thread.is_alive():
            return

        self._thread = threading.Thread(target=self._run, name="recommendation-queue-worker", daemon=True)
        self._thread.start()
        logger.info("Recommendation queue worker thread started.")

    def stop(self):
        self._stop_event.set()

        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
        except Exception:
            logger.debug("Recommendation queue worker channel close raised during shutdown.", exc_info=True)

        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            logger.debug("Recommendation queue worker connection close raised during shutdown.", exc_info=True)

        if self._thread:
            self._thread.join(timeout=5)

    def _run(self):
        while not self._stop_event.is_set():
            try:
                credentials = pika.PlainCredentials(
                    settings.rabbitmq_username,
                    settings.rabbitmq_password)

                params = pika.ConnectionParameters(
                    host=settings.rabbitmq_host,
                    port=settings.rabbitmq_port,
                    credentials=credentials,
                    heartbeat=30)

                self._connection = pika.BlockingConnection(params)
                self._channel = self._connection.channel()
                self._channel.queue_declare(queue=settings.rabbitmq_recommendation_queue, durable=True)
                self._channel.basic_qos(prefetch_count=max(1, settings.rabbitmq_prefetch_count))

                for method_frame, properties, body in self._channel.consume(
                    queue=settings.rabbitmq_recommendation_queue,
                    inactivity_timeout=1):
                    if self._stop_event.is_set():
                        break

                    if method_frame is None:
                        continue

                    try:
                        self._process_message(body)
                    except RetryableWorkerError as ex:
                        logger.warning("Retryable recommendation worker failure: %s", ex, exc_info=True)
                        self._retry_message(body, properties, str(ex))
                        self._ack_delivery(method_frame.delivery_tag)
                    except PermanentWorkerError as ex:
                        logger.warning("Permanent recommendation worker failure: %s", ex, exc_info=True)
                        self._ack_delivery(method_frame.delivery_tag)
                    except Exception:
                        logger.exception("Unhandled error while processing recommendation queue message.")
                        self._retry_message(body, properties, "Unhandled recommendation worker failure.")
                        self._ack_delivery(method_frame.delivery_tag)
                    else:
                        self._ack_delivery(method_frame.delivery_tag)

                try:
                    if self._channel and self._channel.is_open:
                        self._channel.cancel()
                except Exception:
                    logger.debug("Recommendation queue worker cancel raised during shutdown.", exc_info=True)
            except Exception:
                logger.exception("Recommendation queue worker connection failed. Retrying soon.")
                time.sleep(max(1, settings.worker_retry_delay_seconds))
            finally:
                self._cleanup_connection()

    def _process_message(self, body: bytes):
        try:
            message = normalize_json_keys(json.loads(body.decode("utf-8")))
        except (UnicodeDecodeError, json.JSONDecodeError) as ex:
            raise PermanentWorkerError("Queue payload is not valid JSON.") from ex

        source_property = message.get("sourceProperty")

        if not source_property:
            logger.info(
                "Recommendation queue worker left request %s pending because no external source property was available.",
                message.get("requestId"))
            return

        external_house_id = map_source_property_to_house_id(source_property)

        if external_house_id is None:
            logger.warning(
                "Recommendation queue worker could not map source property for request %s back to the recommendation dataset.",
                message.get("requestId"))
            return

        recommendation_payload = build_recommendation_payload(external_house_id, int(message.get("topN", 5) or 5))
        recommendation_rows = recommendation_payload["all_recommendations"]
        mapping_lookup = lookup_internal_property_mappings(recommendation_rows)

        resolved_results = []

        for rank, record in enumerate(recommendation_rows, start=1):
            normalized_url = normalize_url(record.get("url"))
            resolved_results.append({
                "recommendedPropertyId": mapping_lookup.get(normalized_url),
                "externalReference": str(record.get("id") or record.get("url") or ""),
                "similarityScore": float(round(float(record.get("similarity_score", 0.0)), 4)),
                "rank": rank,
                "snapshotTitle": build_snapshot_title(record),
                "snapshotPrice": parse_optional_float(record.get("price"))
            })

        submit_recommendation_resolution(message["resolveCallbackPath"], resolved_results)

    def _ack_delivery(self, delivery_tag):
        if self._channel and self._channel.is_open:
            self._channel.basic_ack(delivery_tag)

    def _retry_message(self, body: bytes, properties, reason: str):
        max_retries = max(0, settings.worker_max_retries)
        current_retry = read_retry_count(getattr(properties, "headers", None))

        if current_retry >= max_retries:
            logger.error(
                "Recommendation worker exhausted retries for a message and will leave the request pending for fallback. Reason: %s",
                reason)
            return

        if self._channel is None or not self._channel.is_open:
            raise RuntimeError("Cannot retry recommendation message because the channel is not open.")

        next_retry = current_retry + 1
        headers = dict(getattr(properties, "headers", {}) or {})
        headers["x-retry-count"] = next_retry

        publish_properties = pika.BasicProperties(
            headers=headers,
            content_type=getattr(properties, "content_type", None) or "application/json",
            delivery_mode=2)

        self._channel.basic_publish(
            exchange="",
            routing_key=settings.rabbitmq_recommendation_queue,
            body=body,
            properties=publish_properties)

        backoff_seconds = min(30, max(1, settings.worker_retry_delay_seconds) * next_retry)
        logger.warning(
            "Recommendation worker requeued a message (attempt %s/%s) after: %s",
            next_retry,
            max_retries,
            reason)
        time.sleep(backoff_seconds)

    def _cleanup_connection(self):
        try:
            if self._channel and self._channel.is_open:
                self._channel.close()
        except Exception:
            pass

        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass

        self._channel = None
        self._connection = None


def build_recommendation_payload(house_id: int, top_n: int):
    if resources["index"] is None:
        raise HTTPException(status_code=503, detail="Search engine initializing.")

    master_df = resources["master_df"]

    try:
        internal_idx = master_df[master_df['id'] == house_id].index[0]
    except IndexError:
        raise HTTPException(status_code=404, detail=f"ID {house_id} not found.")

    query_vector = resources["feature_vectors"][internal_idx].reshape(1, -1)
    distances, indices = resources["index"].search(query_vector, top_n + 1)

    raw_results = []
    for dist, idx in zip(distances[0][1:], indices[0][1:]):
        item = master_df.iloc[idx].to_dict()
        item["similarity_score"] = round(float(dist), 4)
        raw_results.append(item)

    return {
        "metadata": {
            "query_property_id": house_id,
            "total_recommendations_found": len(raw_results),
            "engine": "FAISS-IVFFlat"
        },
        "best_match": raw_results[0] if raw_results else None,
        "all_recommendations": raw_results
    }


def map_source_property_to_house_id(source_property: dict):
    master_df = resources["master_df"]

    if master_df is None or master_df.empty:
        return None

    source_url = normalize_url(source_property.get("sourceListingUrl"))

    if source_url and "url" in master_df.columns:
        normalized_urls = master_df["url"].fillna("").astype(str).map(normalize_url)
        exact_matches = master_df[normalized_urls == source_url]
        if not exact_matches.empty:
            return int(exact_matches.iloc[0]["id"])

    candidates = master_df.copy()
    source_type = normalize_optional_string(source_property.get("propertyType"))
    source_city = normalize_optional_string(source_property.get("city"))
    source_district = normalize_optional_string(source_property.get("district"))
    source_bedrooms = parse_optional_int(source_property.get("bedrooms"))
    source_area = parse_optional_float(source_property.get("area"))
    source_price = parse_optional_float(source_property.get("price"))

    if source_type and "type" in candidates.columns:
        candidates = candidates[candidates["type"].fillna("").astype(str).str.lower() == source_type.lower()]

    if source_bedrooms is not None and "bedrooms" in candidates.columns:
        candidates = candidates[pd.to_numeric(candidates["bedrooms"], errors="coerce") == source_bedrooms]

    if source_area is not None and "size" in candidates.columns:
        size_series = pd.to_numeric(candidates["size"], errors="coerce")
        candidates = candidates[(size_series - source_area).abs() <= 1]

    if source_price is not None and "price" in candidates.columns:
        price_series = pd.to_numeric(candidates["price"], errors="coerce")
        candidates = candidates[(price_series - source_price).abs() <= 0.01]

    if source_city and "location" in candidates.columns:
        candidates = candidates[candidates["location"].fillna("").astype(str).str.contains(source_city, case=False, na=False)]

    if source_district and "location" in candidates.columns:
        district_matches = candidates[candidates["location"].fillna("").astype(str).str.contains(source_district, case=False, na=False)]
        if not district_matches.empty:
            candidates = district_matches

    if candidates.empty:
        return None

    return int(candidates.iloc[0]["id"])


def lookup_internal_property_mappings(recommendation_rows: list[dict]) -> dict[str, str]:
    if not recommendation_rows:
        return {}

    payload = {
        "items": [
            {
                "sourceListingUrl": row.get("url"),
                "title": build_snapshot_title(row),
                "price": parse_optional_float(row.get("price")),
                "city": normalize_optional_string(row.get("location")),
                "district": normalize_optional_string(row.get("location")),
                "propertyType": normalize_optional_string(row.get("type")),
                "area": parse_optional_float(row.get("size")),
                "bedrooms": parse_optional_int(row.get("bedrooms"))
            }
            for row in recommendation_rows
        ]
    }

    headers = {settings.dotnet_ai_service_token_header: settings.dotnet_ai_service_token}

    try:
        with httpx.Client(
            base_url=settings.dotnet_api_base_url,
            timeout=30,
            verify=settings.dotnet_verify_tls,
            headers=headers) as client:
            response = client.post("/api/internal/ai/property-mappings/lookup", json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as ex:
        raise_worker_http_error("Property mapping lookup", ex)
    except httpx.RequestError as ex:
        raise RetryableWorkerError("Property mapping lookup could not reach the .NET API.") from ex

    mappings = {}

    for result in data.get("results", []):
        property_id = result.get("propertyId")
        source_listing_url = normalize_url(result.get("sourceListingUrl"))

        if property_id and source_listing_url:
            mappings[source_listing_url] = property_id

    return mappings


def submit_recommendation_resolution(resolve_callback_path: str, resolved_results: list[dict]):
    headers = {settings.dotnet_ai_service_token_header: settings.dotnet_ai_service_token}
    payload = {
        "isSuccessful": True,
        "results": resolved_results
    }

    try:
        with httpx.Client(
            base_url=settings.dotnet_api_base_url,
            timeout=30,
            verify=settings.dotnet_verify_tls,
            headers=headers) as client:
            response = client.post(resolve_callback_path, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as ex:
        raise_worker_http_error("Recommendation resolution callback", ex)
    except httpx.RequestError as ex:
        raise RetryableWorkerError("Recommendation resolution callback could not reach the .NET API.") from ex


def build_snapshot_title(record: dict) -> str:
    property_type = normalize_optional_string(record.get("type")) or "Property"
    location = normalize_optional_string(record.get("location")) or "Egypt"
    return f"{property_type} in {location}"


def normalize_optional_string(value):
    if value is None:
        return None

    text = str(value).strip()
    return text if text else None


def parse_optional_float(value):
    if value is None or value == "":
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_optional_int(value):
    if value is None or value == "":
        return None

    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def normalize_url(value):
    if value is None:
        return ""

    text = str(value).strip()

    if not text:
        return ""

    return text.rstrip("/").lower()


def normalize_json_keys(value):
    if isinstance(value, dict):
        normalized = {}

        for key, item in value.items():
            normalized_key = key[:1].lower() + key[1:] if isinstance(key, str) and key else key
            normalized[normalized_key] = normalize_json_keys(item)

        return normalized

    if isinstance(value, list):
        return [normalize_json_keys(item) for item in value]

    return value


def read_retry_count(headers) -> int:
    if not headers:
        return 0

    raw_value = headers.get("x-retry-count", 0)

    try:
        return max(0, int(raw_value))
    except (TypeError, ValueError):
        return 0


def raise_worker_http_error(action: str, ex: httpx.HTTPStatusError) -> None:
    status_code = ex.response.status_code
    body = ex.response.text[:300]

    if status_code >= 500 or status_code == 429:
        raise RetryableWorkerError(f"{action} returned {status_code}: {body}") from ex

    raise PermanentWorkerError(f"{action} returned {status_code}: {body}") from ex


recommendation_queue_worker = RecommendationQueueWorker()


def ensure_runtime_artifacts(base_dir: str) -> None:
    required_paths = [
        os.path.join(base_dir, "faiss_index.bin"),
        os.path.join(base_dir, "Datasets", "master_dataset.csv"),
        os.path.join(base_dir, "Datasets", "preprocessed_dataset.csv"),
    ]

    if all(os.path.exists(path) for path in required_paths):
        return

    logger.info("Recommendation runtime artifacts are missing. Building them with the local pipeline.")

    result = subprocess.run(
        [sys.executable, "main.py"],
        cwd=base_dir,
        check=False)

    if result.returncode != 0 or not all(os.path.exists(path) for path in required_paths):
        raise RuntimeError("Recommendation artifacts could not be prepared automatically.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager: Executes initialization logic on startup and 
    cleanup logic on shutdown.
    """
    # Define paths relative to the project root
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INDEX_PATH = os.path.join(BASE_DIR, 'faiss_index.bin')
    MASTER_PATH = os.path.join(BASE_DIR, 'Datasets', 'master_dataset.csv')
    ENCODED_PATH = os.path.join(BASE_DIR, 'Datasets', 'preprocessed_dataset.csv')

    ensure_runtime_artifacts(BASE_DIR)

    # Ensure all required artifacts exist before starting
    files = [INDEX_PATH, MASTER_PATH, ENCODED_PATH]
    if not all(os.path.exists(p) for p in files):
        print("CRITICAL ERROR: Startup failed. Missing model or dataset files.")
    else:
        print("Loading Baytology Recommendation Engine...")
        
        # 1. Load FAISS Index (The Vector Search Engine)
        resources["index"] = faiss.read_index(INDEX_PATH)
        
        # 2. Load Master Metadata (Human-readable data for display)
        resources["master_df"] = pd.read_csv(MASTER_PATH)
        
        # 3. Load Preprocessed Vectors 
        # We need these to retrieve the 'query vector' for a specific property ID.
        df_enc = pd.read_csv(ENCODED_PATH)
        # Drop ID as it is a label, not a searchable feature
        resources["feature_vectors"] = df_enc.drop(columns=['id']).values.astype('float32')
        
        print(f"Engine online: {len(resources['master_df'])} properties indexed.")
    
    recommendation_queue_worker.start()

    try:
        yield
    finally:
        recommendation_queue_worker.stop()
        resources["index"] = None
        resources["master_df"] = None
        resources["feature_vectors"] = None

# Initialize FastAPI with metadata for Swagger UI (/docs)
app = FastAPI(
    title="Baytology API",
    description="Vector-based property recommendation engine for the Egyptian real estate market.",
    version="1.0.0",
    lifespan=lifespan
)

# --- Endpoints ---

@app.get("/", tags=["Health"])
def health_check():
    """Returns the current status of the API."""
    return {
        "status": "Online", 
        "engine": "FAISS",
        "region": "Egypt"
    }

@app.get("/recommend/{house_id}", tags=["Recommendation"])
async def get_recommendations(
    house_id: int, 
    n: int = Query(default=5, ge=1, le=20, description="Number of properties")
):
    return build_recommendation_payload(house_id, n)

# --- Execution Instructions ---
# Run via terminal: uvicorn app:app --reload
