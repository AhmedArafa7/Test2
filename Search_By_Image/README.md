# Baytology Image Search AI Microservice

A production-ready **FastAPI** microservice that powers visual property similarity search for the Baytology real-estate platform. Given a user-uploaded property image and a set of location-filtered property IDs from the .NET Core backend, the service extracts deep visual features using a headless **ResNet50** model and performs an optimized **FAISS** cosine-similarity search — returning the most visually similar properties in milliseconds.

---

## Architecture & Workflow

```
┌──────────────┐       ┌──────────────────────┐       ┌───────────────────────┐
│  .NET Core   │       │   FastAPI Service     │       │     FAISS Index        │
│  Backend     │──────▶│                      │──────▶│  (IndexIDMap +         │
│              │  POST │  1. Decode image      │       │   IndexFlatIP)         │
│  Sends:      │       │  2. ResNet50 → 2048-d │       │                       │
│  • image     │       │  3. L2 normalize      │       │  Filtered via          │
│  • valid_ids │       │  4. FAISS search with │       │  IDSelectorBatch       │
│  • k         │       │     IDSelectorBatch   │       │                       │
└──────────────┘       └──────────────────────┘       └───────────────────────┘
                                │
                                ▼
                       JSON Response:
                       [{ property_id, similarity_score }]
```

**Step-by-step:**

1. **Image Upload** — The .NET backend sends a property photo alongside a pre-filtered list of property UUIDs (scoped to the user's selected location).
2. **Feature Extraction** — The image is preprocessed with standard ImageNet transforms (Resize 256 → CenterCrop 224 → Normalize) and passed through a headless ResNet50 (`fc` layer replaced with `Identity()`), producing a **2048-dimensional** embedding.
3. **L2 Normalization** — The vector is L2-normalized so that FAISS Inner Product search is mathematically equivalent to **cosine similarity**.
4. **Filtered FAISS Search** — The valid UUIDs are mapped to internal FAISS integer IDs. A `faiss.IDSelectorBatch` restricts the search strictly to those IDs — the full index is never scanned.
5. **Response** — Top-k results are returned as UUID property IDs with their similarity scores, sorted descending.

---

## Directory Structure

```
Search_By_Image/
├── data/
│   ├── property_vision_index.faiss   # Pre-built FAISS index (~120 MB)
│   ├── faiss_id_mapping.json         # int → UUID mapping
│   └── updated_properties.csv        # Scraper output with Image_Path column
│
├── images/                           # Downloaded property images (UUID.jpg)
│
├── logs/
│   └── failed_downloads.log          # Scraper error log
│
├── src/
│   ├── config.py                     # Centralized paths, constants, settings
│   ├── scraper.py                    # undetected-chromedriver web scraper
│   ├── file_handler.py               # Logging and file I/O utilities
│   ├── main.py                       # Scraper CLI entry point
│   ├── feature_extractor.py          # ResNet50 model, ImageNet transforms, batch extraction
│   ├── faiss_indexer.py              # FAISS index build / save / load
│   ├── build_index.py                # Offline indexing pipeline entry point
│   ├── search_service.py             # Core search logic (inference + filtered FAISS query)
│   └── api.py                        # FastAPI application and endpoints
│
├── requirements.txt                  # All Python dependencies
└── README.md
```

---

## Installation & Setup

### Prerequisites

- **Python 3.11+**
- ~2 GB disk space for PyTorch model weights + FAISS index

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Search_By_Image
```

### 2. Create a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

> **Note:** On first run, PyTorch will automatically download the ResNet50 ImageNet weights (~98 MB) to `~/.cache/torch/`.

---



---

## Running the API

```bash
cd src/
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

The server loads the FAISS index and ResNet50 model into memory at startup. Once you see `SearchService ready.` in the logs, the API is accepting requests.

**Health check:**

```bash
curl http://localhost:8000/health
```

```json
{ "status": "ok", "index_size": 19924 }
```

**Interactive docs:** Visit [http://localhost:8000/docs](http://localhost:8000/docs) for the auto-generated Swagger UI.

---

## API Documentation for Backend Integration

### `POST /api/v1/search-image`

Search for visually similar properties by uploading an image and specifying which property IDs are eligible (pre-filtered by location on the .NET side).

---

#### Request

| Field | Type | Location | Required | Description |
|---|---|---|---|---|
| `image` | `file` | `multipart/form-data` | ✅ | The property image to search with (JPEG/PNG) |
| `valid_ids` | `string` | `multipart/form-data` | ✅ | A **JSON-encoded array** of property UUID strings |
| `k` | `integer` | `multipart/form-data` | ❌ | Number of results to return (default: `5`) |

> **Important:** `valid_ids` must be a JSON **string**, not a raw array. This is because `multipart/form-data` only supports string fields alongside file uploads.

---

#### cURL Example

```bash
curl -X POST http://localhost:8000/api/v1/search-image \
  -F "image=@/path/to/apartment_photo.jpg" \
  -F 'valid_ids=["0003390B-ACEA-4BA8-99FA-905D44630E93", "001124C0-1C8D-4EB0-8899-DB16BF21256E", "001993D5-924C-4D38-8008-85C7E55CAD94", "001B552C-B4C5-42C5-AD43-5FDAF614BB60", "001D33A4-68BE-4964-8DD1-D15B110A1B3A"]' \
  -F "k=3"
```

---

#### C# / .NET HttpClient Example

```csharp
using var form = new MultipartFormDataContent();

// Attach the image file
var imageContent = new ByteArrayContent(imageBytes);
imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
form.Add(imageContent, "image", "property.jpg");

// Attach the pre-filtered IDs as a JSON string
var validIds = JsonSerializer.Serialize(filteredPropertyIds);
form.Add(new StringContent(validIds), "valid_ids");

// Number of results
form.Add(new StringContent("5"), "k");

var response = await httpClient.PostAsync(
    "http://localhost:8000/api/v1/search-image", form);

var result = await response.Content.ReadFromJsonAsync<SearchResponse>();
```

---

#### Response — `200 OK`

```json
{
  "matches": [
    {
      "property_id": "001124C0-1C8D-4EB0-8899-DB16BF21256E",
      "similarity_score": 0.934521
    },
    {
      "property_id": "0003390B-ACEA-4BA8-99FA-905D44630E93",
      "similarity_score": 0.891034
    },
    {
      "property_id": "001B552C-B4C5-42C5-AD43-5FDAF614BB60",
      "similarity_score": 0.847612
    }
  ],
  "total": 3
}
```

| Field | Type | Description |
|---|---|---|
| `matches` | `array` | Ranked list of similar properties (highest score first) |
| `matches[].property_id` | `string` | The UUID of the matched property |
| `matches[].similarity_score` | `float` | Cosine similarity score (0.0 – 1.0, higher = more similar) |
| `total` | `integer` | Number of matches returned |

---

#### Error Responses

| Status | Condition | Example `detail` |
|---|---|---|
| `400` | Invalid or empty `valid_ids` | `"Invalid valid_ids format: ... Expected a JSON array of strings."` |
| `400` | Corrupt or unreadable image | `"Cannot decode image: ..."` |
| `400` | Empty image upload | `"Uploaded image is empty."` |
| `500` | Internal FAISS or model error | `"Feature extraction error: ..."` |

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Web Framework | FastAPI + Uvicorn | Async HTTP server with auto-generated OpenAPI docs |
| Feature Extractor | PyTorch + torchvision | ResNet50 (ImageNet-pretrained, headless) → 2048-d embeddings |
| Vector Search | FAISS (faiss-cpu) | `IndexIDMap(IndexFlatIP)` with `IDSelectorBatch` for filtered cosine search |
| Image Preprocessing | Pillow + torchvision.transforms | Resize, CenterCrop, Normalize to ImageNet statistics |
| Web Scraper | undetected-chromedriver + Selenium | Bypasses AWS WAF for property image downloads |
| Data Handling | Pandas | CSV processing and DataFrame management |
