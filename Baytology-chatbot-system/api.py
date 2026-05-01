"""
Baytology FastAPI backend.

Provides endpoints for:
- /parse   : Parse Arabic text to structured filters
- /question: Generate entropy-based follow-up questions
- /rank    : Rank properties by ML deal score
- /search  : Filter properties from the dataset
- /chat    : Full conversational search flow
"""
from typing import Optional
import os

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from config import settings
from image_search_utils import search_by_image, validate_image_type
from model.helper_functions import score_and_rank
from parser.data_validation import RealEstateQuery
from parser.parse_user_txt import parse_user_query
from search_engine.calculate_entropy import ask_user_question_Based_on_entropy
from search_engine.search_engine import search_properties as find_matching_properties
from voice_utils import transcribe_audio, validate_audio_type


app = FastAPI(
    title="Baytology API",
    description="Egyptian Real Estate Chatbot API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}


class ParseRequest(BaseModel):
    text: str
    session_id: str


class ParseResponse(BaseModel):
    filters: dict
    message: str = "Parsed successfully"


class QuestionRequest(BaseModel):
    session_id: str
    properties_count: int
    current_filters: dict
    skipped_attributes: list[str] = []


class QuestionResponse(BaseModel):
    question: str
    attribute: Optional[str] = None
    has_question: bool = True


class RankRequest(BaseModel):
    properties: list[dict]


class RankResponse(BaseModel):
    ranked: list[dict]


class SearchRequest(BaseModel):
    filters: dict


class SearchResponse(BaseModel):
    count: int
    properties: list[dict]


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    type: str
    message: str
    question: Optional[str] = None
    attribute: Optional[str] = None
    properties: list[dict] = []
    properties_count: int = 0


class VoiceChatResponse(ChatResponse):
    transcription: str


class ImageSearchResponse(BaseModel):
    count: int
    properties: list[dict]
    message: str
    engine: str
    query_image: dict


def get_project_root():
    return os.path.dirname(os.path.abspath(__file__))


def load_resources():
    """Load ML model resources."""
    root = get_project_root()
    brains_dir = os.path.join(root, "model", "brains")
    try:
        model = joblib.load(os.path.join(brains_dir, "price_model.pkl"))
        le_loc = joblib.load(os.path.join(brains_dir, "location_encoder.pkl"))
        le_type = joblib.load(os.path.join(brains_dir, "type_encoder.pkl"))
        le_pay = joblib.load(os.path.join(brains_dir, "payment_encoder.pkl"))
    except FileNotFoundError:
        model, le_loc, le_type, le_pay = None, None, None, None

    return model, le_loc, le_type, le_pay


def get_llm():
    """Get the parser LLM."""
    llm = ChatOpenAI(
        base_url=settings.lm_studio_url,
        api_key="lm-studio",
        model=settings.lm_studio_model,
        temperature=0.3,
    )
    return llm.with_structured_output(RealEstateQuery)


model, le_loc, le_type, le_pay = load_resources()
structured_llm = get_llm()


ATTRIBUTE_KEYWORDS = {
    "min_bedrooms": "غرف نوم",
    "min_bathrooms": "حمامات",
    "max_price": "جنيه ميزانية",
    "min_size_sqm": "متر مساحة",
    "compound": "كومبوند",
    "payment_method": "دفع",
    "property_type": "نوع",
    "city": "مدينة",
    "governorate": "محافظة",
    "district": "منطقة",
}

PROPERTY_KEYWORDS = [
    "شقة",
    "شقه",
    "فيلا",
    "عقار",
    "بيت",
    "منزل",
    "استوديو",
    "دوبلكس",
    "تاون",
    "توين",
    "بنتهاوس",
    "شاليه",
    "روف",
    "دور",
    "غرفة",
    "غرف",
    "حمام",
    "حمامات",
    "مساحة",
    "متر",
    "ريسبشن",
    "سعر",
    "ميزانية",
    "جنيه",
    "مليون",
    "الف",
    "ألف",
    "التجمع",
    "اكتوبر",
    "أكتوبر",
    "الشيخ زايد",
    "زايد",
    "المعادي",
    "مدينة نصر",
    "العاصمة",
    "الساحل",
    "العين السخنة",
    "القاهرة",
    "القاهره",
    "قاهرة",
    "قاهره",
    "الجيزة",
    "الجيزه",
    "جيزة",
    "جيزه",
    "اسكندرية",
    "اسكندريه",
    "الإسكندرية",
    "الاسكندرية",
    "مصر الجديدة",
    "الرحاب",
    "مدينتي",
    "كومبوند",
    "شراء",
    "اشتري",
    "بدور",
    "عايز",
    "محتاج",
    "ابحث",
    "كاش",
    "قسط",
    "تقسيط",
    "دفع",
]

NEGATIVE_RESPONSES = [
    "لا",
    "لأ",
    "مش مهم",
    "مش فارق",
    "اي حاجة",
    "أي حاجة",
    "خلاص",
    "عادي",
    "مفيش فرق",
    "كده تمام",
    "مش عايز",
    "مش محتاج",
    "لا شكرا",
    "no",
    "skip",
    "any",
    "doesn't matter",
    "don't care",
]


def get_session(session_id: str) -> dict:
    """Get or create session state."""
    if session_id not in sessions:
        sessions[session_id] = {
            "filters": {},
            "skipped_attributes": set(),
            "last_asked_attribute": None,
        }
    return sessions[session_id]


def df_to_dict_list(dataframe: pd.DataFrame, limit: int = 20) -> list[dict]:
    """Convert a dataframe to JSON-safe records."""
    return dataframe.head(limit).to_dict(orient="records")


def is_short_response(text: str) -> bool:
    """Check if the response is very short."""
    text = text.strip()
    words = text.split()
    return len(words) <= 3 or text.isdigit()


def enhance_short_response(text: str, last_asked_attr: str) -> str:
    """Add missing context to short follow-up answers."""
    if not last_asked_attr:
        return text

    keyword = ATTRIBUTE_KEYWORDS.get(last_asked_attr, "")
    if keyword:
        return f"{text} {keyword}"
    return text


def classify_intent(text: str, session: dict) -> str:
    """
    Classify whether the message is a property-search request or general chat.
    """
    if session.get("filters") and any(v for v in session["filters"].values()):
        return "property_search"

    normalized_text = text.strip().lower()

    for keyword in PROPERTY_KEYWORDS:
        if keyword in normalized_text:
            return "property_search"

    return "general_chat"


def get_chat_response(text: str) -> str:
    """Get a general conversational response from the LLM."""
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = ChatOpenAI(
        base_url=settings.lm_studio_url,
        api_key="lm-studio",
        model=settings.lm_studio_model,
        temperature=0.7,
    )

    system_prompt = """أنت مساعد عقارات مصري اسمك Baytology.
أنت متخصص في مساعدة الناس على العثور على العقارات المناسبة في مصر.

إذا سأل المستخدم عن شيء غير متعلق بالعقارات، رد بأدب واشرح له أن دورك الأساسي هو المساعدة في البحث عن العقارات.

أمثلة:
- إذا قال "مرحبا" أو "هاي" رد عليه: "أهلاً! أنا Baytology، مساعدك في البحث عن العقارات في مصر. قولّي بتدور على إيه؟ شقة؟ فيلا؟"
- إذا سأل عن خدماتك، اشرح أنك تساعده في البحث عن شقق وفيلات وعقارات في مصر.

كن ودودًا ومختصرًا، ورد باللهجة المصرية."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=text),
    ]

    response = llm.invoke(messages)
    return response.content


@app.get("/")
def root():
    return {"status": "ok", "message": "Baytology API is running"}


@app.post("/parse", response_model=ParseResponse)
def parse_text(request: ParseRequest):
    """Parse Arabic text to structured filters."""
    try:
        result = parse_user_query(structured_llm, request.text)

        if result is None:
            result = {}

        filters = {k: v for k, v in result.items() if v is not None}

        session = get_session(request.session_id)
        session["filters"].update(filters)

        return ParseResponse(filters=filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/question", response_model=QuestionResponse)
def generate_question(request: QuestionRequest):
    """Generate an entropy-based follow-up question."""
    try:
        matches = find_matching_properties(request.current_filters)

        question, attribute = ask_user_question_Based_on_entropy(
            matches,
            request.current_filters,
            set(request.skipped_attributes),
        )

        return QuestionResponse(
            question=question,
            attribute=attribute,
            has_question=attribute is not None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rank", response_model=RankResponse)
def rank_properties(request: RankRequest):
    """Rank properties by ML deal score."""
    try:
        if model is None:
            return RankResponse(ranked=request.properties)

        properties_df = pd.DataFrame(request.properties)
        ranked_df = score_and_rank(properties_df, le_loc, le_type, le_pay, model)

        return RankResponse(ranked=df_to_dict_list(ranked_df))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse)
def search_properties(request: SearchRequest):
    """Filter properties from the dataset."""
    try:
        matches = find_matching_properties(request.filters)

        return SearchResponse(
            count=len(matches),
            properties=df_to_dict_list(matches, limit=settings.max_results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Full chat endpoint that handles the complete conversational search flow.
    """
    try:
        session = get_session(request.session_id)

        intent = classify_intent(request.message, session)

        if intent == "general_chat":
            chat_response = get_chat_response(request.message)
            return ChatResponse(
                type="chat",
                message=chat_response,
                properties_count=0,
            )

        is_skip = any(neg in request.message.lower() for neg in NEGATIVE_RESPONSES)

        if is_skip and session["last_asked_attribute"]:
            session["skipped_attributes"].add(session["last_asked_attribute"])
            session["last_asked_attribute"] = None
            print(f"[DEBUG] Skipped attribute: {session['skipped_attributes']}")
        else:
            parse_text_value = request.message
            if session["last_asked_attribute"] and is_short_response(request.message):
                parse_text_value = enhance_short_response(
                    request.message,
                    session["last_asked_attribute"],
                )
                print(f"[DEBUG] Enhanced text: '{parse_text_value}'")

            result = parse_user_query(structured_llm, parse_text_value)
            print(f"[DEBUG] Parse result: {result}")
            if result:
                filters = {k: v for k, v in result.items() if v is not None}
                session["filters"].update(filters)

        print(f"[DEBUG] Session filters: {session['filters']}")

        matches = find_matching_properties(session["filters"])
        count = len(matches)
        print(f"[DEBUG] Match count: {count}")

        if count == 0:
            location_keys = ["governorate", "city", "district", "compound"]
            fallback_filters = {
                k: v
                for k, v in session["filters"].items()
                if k in location_keys and v
            }

            fallback_matches = (
                find_matching_properties(fallback_filters)
                if fallback_filters
                else pd.DataFrame()
            )

            if not fallback_matches.empty:
                return ChatResponse(
                    type="fallback",
                    message="للأسف مفيش حاجة بالمواصفات دي بالظبط، بس دي أفضل الفرص المتاحة:",
                    properties=df_to_dict_list(fallback_matches, limit=5),
                    properties_count=len(fallback_matches),
                )

            return ChatResponse(
                type="no_results",
                message="للأسف مفيش أي عقارات مطابقة حاليًا.",
                properties_count=0,
            )

        if count > settings.max_results:
            question, attribute = ask_user_question_Based_on_entropy(
                matches,
                session["filters"],
                session["skipped_attributes"],
            )

            session["last_asked_attribute"] = attribute

            if attribute is None:
                ranked = (
                    score_and_rank(matches, le_loc, le_type, le_pay, model)
                    if model
                    else matches
                )

                return ChatResponse(
                    type="results",
                    message=f"تمام! دي أفضل {min(count, settings.max_results)} وحدة ليك:",
                    properties=df_to_dict_list(ranked),
                    properties_count=count,
                )

            return ChatResponse(
                type="question",
                message=f"أنا لقيت {count} وحدة مناسبة.",
                question=question,
                attribute=attribute,
                properties_count=count,
            )

        ranked = (
            score_and_rank(matches, le_loc, le_type, le_pay, model)
            if model
            else matches
        )

        return ChatResponse(
            type="results",
            message=f"تمام! لقيت {count} وحدات ممتازة ليك:",
            properties=df_to_dict_list(ranked),
            properties_count=count,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(
    session_id: str = Form(...),
    audio: UploadFile = File(...),
):
    """
    Accept an audio upload, transcribe it, then run the normal chat pipeline.
    """
    try:
        mime_type = validate_audio_type(audio.content_type)
        print(f"[VOICE] Received audio: {audio.filename}, type: {mime_type}")

        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file")

        print(f"[VOICE] Audio size: {len(audio_bytes)} bytes")

        transcribed_text = transcribe_audio(audio_bytes, mime_type)
        print(f"[VOICE] Transcription: '{transcribed_text}'")

        chat_response = chat(ChatRequest(session_id=session_id, message=transcribed_text))

        return VoiceChatResponse(
            transcription=transcribed_text,
            type=chat_response.type,
            message=chat_response.message,
            question=chat_response.question,
            attribute=chat_response.attribute,
            properties=chat_response.properties,
            properties_count=chat_response.properties_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[VOICE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing error: {e}")


@app.post("/image-search", response_model=ImageSearchResponse)
async def image_search(
    image: UploadFile = File(...),
    top_n: int = Form(10),
):
    """
    Accept an image upload and return visually similar properties.
    """
    try:
        mime_type = validate_image_type(image.content_type)
        print(f"[IMAGE] Received image: {image.filename}, type: {mime_type}")

        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file")

        print(f"[IMAGE] Image size: {len(image_bytes)} bytes")

        result = search_by_image(
            image_bytes=image_bytes,
            mime_type=mime_type,
            top_n=top_n,
        )
        return ImageSearchResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"[IMAGE] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Image search error: {e}")


@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    """Clear session data."""
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "ok", "message": "Session cleared"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
