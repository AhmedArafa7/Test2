# src/api.py
"""
FastAPI microservice for image-based property similarity search.

Endpoints:
    POST /api/v1/search-image  — accepts an image + pre-filtered property IDs,
                                  returns top-k similar properties.

Run:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from search_service import SearchService

# ── Globals ──────────────────────────────────────────────────────────
search_service: SearchService | None = None


# ── Lifespan (startup / shutdown) ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global search_service
    logger.info("Loading SearchService (FAISS index + ResNet50)...")
    search_service = SearchService()
    logger.info("SearchService ready.")
    yield
    logger.info("Shutting down SearchService.")


# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="Property Vision Search API",
    description="Image-based real-estate similarity search with pre-filtered IDs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("scraper")


# ── Response models ──────────────────────────────────────────────────
class MatchResult(BaseModel):
    property_id: str
    similarity_score: float


class SearchResponse(BaseModel):
    matches: list[MatchResult]
    total: int


# ── Endpoint ─────────────────────────────────────────────────────────
@app.post(
    "/api/v1/search-image",
    response_model=SearchResponse,
    summary="Search similar properties by image",
)
async def search_image(
    image: UploadFile = File(..., description="Property image to search with"),
    valid_ids: str = Form(..., description='JSON array of property UUID strings, e.g. ["ABC-...", "DEF-..."]'),
    k: int = Form(5, description="Number of top results to return"),
):
    """
    Accepts a property image and a JSON list of valid property IDs (UUIDs)
    pre-filtered by the .NET backend (e.g. by location).

    Returns the top-k most visually similar properties from the allowed set.
    """
    # ── Validate valid_ids ───────────────────────────────────────────
    try:
        id_list = json.loads(valid_ids)
        if not isinstance(id_list, list):
            raise ValueError("valid_ids must be a JSON array")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid valid_ids format: {e}. Expected a JSON array of strings.",
        )

    if len(id_list) == 0:
        raise HTTPException(status_code=400, detail="valid_ids array is empty.")

    # Ensure all entries are strings
    id_list = [str(i) for i in id_list]

    # ── Read & validate image ────────────────────────────────────────
    try:
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read image: {e}")

    # ── Extract feature vector ───────────────────────────────────────
    try:
        query_vec = search_service.extract_query_vector(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Feature extraction failed")
        raise HTTPException(status_code=500, detail=f"Feature extraction error: {e}")

    # ── Run FAISS search ─────────────────────────────────────────────
    try:
        matches = search_service.search(query_vec, id_list, k=k)
    except Exception as e:
        logger.exception("FAISS search failed")
        raise HTTPException(status_code=500, detail=f"Search error: {e}")

    return SearchResponse(matches=matches, total=len(matches))


# ── Health check ─────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "index_size": search_service.index.ntotal if search_service else 0,
    }
