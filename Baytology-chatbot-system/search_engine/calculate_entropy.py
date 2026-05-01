"""
Entropy-based question generator for the real estate chatbot.
"""
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from scipy.stats import entropy

from config import settings
from parser.data_validation import RealEstateQuery


def calculate_column_entropy(column, base=2):
    """Calculate Shannon entropy for a pandas column."""
    value_counts = column.value_counts()
    return entropy(value_counts, base=base)


def calculate_all_columns_entropy(data_frame):
    """
    Calculate entropy for every dataframe column.
    Returns: {'col_name': entropy_score}
    """
    entropy_results = {}
    for col in data_frame.columns:
        entropy_results[col] = calculate_column_entropy(data_frame[col])

    return entropy_results


def ask_user_question_Based_on_entropy(data_frame, current_filters, skipped_attributes=None):
    """
    Ask a single short follow-up question about the most informative missing attribute.

    Returns:
        tuple[str, str | None]: (question_text, attribute_name)
    """
    if skipped_attributes is None:
        skipped_attributes = set()

    all_entropies = calculate_all_columns_entropy(data_frame)

    column_mapping = {
        "governorate": "governorate",
        "city": "city",
        "district": "district",
        "compound": "compound",
        "price": "max_price",
        "size_sqm": "min_size_sqm",
        "bedrooms": "min_bedrooms",
        "bathrooms": "min_bathrooms",
        "type": "property_type",
        "payment_method": "payment_method",
        "mid_room": "mid_room",
    }

    valid_entropies = {}

    for csv_col, entropy_val in all_entropies.items():
        filter_key = column_mapping.get(csv_col)

        if not filter_key:
            continue

        if filter_key not in RealEstateQuery.model_fields:
            continue

        user_value = current_filters.get(filter_key)
        if user_value is not None:
            continue

        if filter_key in skipped_attributes:
            continue

        valid_entropies[filter_key] = entropy_val

    if not valid_entropies:
        return ("تمام، عندي كل التفاصيل اللي محتاجها. تحب أعرض لك النتائج؟", None)

    target_key = max(valid_entropies, key=valid_entropies.get)
    field_description = RealEstateQuery.model_fields[target_key].description

    try:
        llm = ChatOpenAI(
            base_url=settings.lm_studio_url,
            api_key="lm-studio",
            model=settings.lm_studio_model,
            temperature=0.1,
        )

        template = """You are a helpful Egyptian real estate assistant.

The user has NOT specified: '{attribute_name}'.
Field context: {attribute_description}

IMPORTANT:
- Ask ONLY ONE short question about this specific attribute.
- Do NOT ask about anything else.
- Write the question in Egyptian Arabic.
- Keep it under 15 words.

Examples:
- Budget: "ميزانيتك كام تقريبًا؟"
- Compound: "في كومبوند معين تفضله؟"
- Payment: "كاش ولا قسط؟"
- Bedrooms: "عايز كام أوضة؟"

Your single question about {attribute_name}:"""

        prompt = PromptTemplate.from_template(template)
        chain = prompt | llm | StrOutputParser()

        question = chain.invoke(
            {
                "attribute_name": target_key,
                "attribute_description": field_description,
            }
        )

        return (question.strip(), target_key)
    except Exception as e:
        print(f"LangChain Error: {e}")
        return (f"ممكن تقولّي تفضيلاتك بخصوص {target_key}؟", target_key)
