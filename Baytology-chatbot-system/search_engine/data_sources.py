from __future__ import annotations

from contextlib import closing
from pathlib import Path
from typing import Iterable

import pandas as pd
import pyodbc

from config import settings


NUMERIC_COLUMNS = ("price", "bedrooms", "bathrooms", "size_sqm", "mid_room")
STRING_COLUMNS = (
    "governorate",
    "city",
    "district",
    "compound",
    "type",
    "payment_method",
    "location",
    "description",
    "title",
    "image_url",
    "listing_type",
    "url",
)

SQL_PROPERTY_QUERY = """
SELECT
    p.Id AS property_id,
    p.Title AS title,
    p.Description AS description,
    p.PropertyType AS type,
    p.ListingType AS listing_type,
    p.Price AS price,
    p.Area AS size_sqm,
    p.Bedrooms AS bedrooms,
    p.Bathrooms AS bathrooms,
    p.City AS city,
    p.District AS district,
    p.AddressLine AS address_line,
    p.SourceListingUrl AS url,
    img.Url AS image_url,
    a.HasParking AS has_parking,
    a.HasPool AS has_pool,
    a.HasGym AS has_gym,
    a.HasElevator AS has_elevator,
    a.HasSecurity AS has_security,
    a.HasBalcony AS has_balcony,
    a.HasGarden AS has_garden,
    a.HasCentralAC AS has_central_ac,
    a.FurnishingStatus AS furnishing_status,
    a.ViewType AS view_type
FROM Properties p
LEFT JOIN PropertyAmenities a ON a.PropertyId = p.Id
OUTER APPLY (
    SELECT TOP 1 pi.Url
    FROM PropertyImages pi
    WHERE pi.PropertyId = p.Id
    ORDER BY pi.SortOrder, pi.Id
) img
"""

PROPERTY_TYPE_PATTERNS: tuple[tuple[str, Iterable[str]], ...] = (
    ("Hotel Apartment", ("hotel apartment", "serviced apartment")),
    ("Twin House", ("twin house", "twinhouse", "توين")),
    ("Townhouse", ("townhouse", "town house", "تاون")),
    ("Penthouse", ("penthouse", "بنتهاوس")),
    ("Duplex", ("duplex", "دوبلكس")),
    ("iVilla", ("ivilla", "i villa", "اي فيلا")),
    ("Chalet", ("chalet", "شاليه")),
    ("Villa", ("villa", "standalone villa", "فيلا")),
    ("Roof", ("roof", "روف")),
    ("Cabin", ("cabin",)),
    ("Palace", ("palace",)),
    ("Land", ("land", "plot", "ارض", "أرض")),
    ("Apartment", ("apartment", "flat", "شقة", "شقه")),
)

INSTALLMENT_KEYWORDS = (
    "installment",
    "installments",
    "down payment",
    "payment plan",
    "remaining",
    "years",
    "months",
    "interest free",
    "no interest",
    "تقسيط",
    "قسط",
    "اقساط",
    "أقساط",
    "مقدم",
)

CASH_KEYWORDS = ("cash", "كاش", "full cash", "total cash")

MAID_ROOM_KEYWORDS = (
    "maid room",
    "maid's room",
    "nanny room",
    "maids room",
    "غرفة شغالة",
    "غرفة خادمة",
    "غرفة ناني",
    "غرفة خدمات",
)

GOVERNORATE_KEYWORDS: tuple[tuple[str, Iterable[str]], ...] = (
    ("North Coast", ("north coast", "ras al hekma", "ras el hekma", "sidi abdel rahman", "sidi heneish", "al alamein", "new alamein")),
    ("Red Sea", ("red sea", "hurghada", "al gouna", "el gouna", "safaga", "soma bay")),
    ("Giza", ("giza", "6 october", "6th of october", "sheikh zayed", "new zayed", "dahshur")),
    ("Cairo", ("cairo", "new cairo", "5th settlement", "katameya", "heliopolis", "maadi", "nasr city", "badr city", "shorouk", "mostakbal city", "future city", "new capital")),
    ("Alexandria", ("alexandria", "smouha", "miami", "agamy", "stanley")),
    ("Suez", ("sokhna", "عين السخنة", "al ain al sokhna")),
)


def load_property_data(filters: dict | None = None, filepath: str | None = None) -> pd.DataFrame:
    """Load property data from the configured source and normalize it for search."""
    source = settings.property_data_source.strip().lower()

    if source in {"sql", "sqlserver", "database", "db"}:
        return load_sql_data(filters or {})

    csv_path = filepath or settings.csv_file_path
    return load_csv_data(csv_path)


def load_csv_data(filepath: str) -> pd.DataFrame:
    """Load and normalize the legacy CSV dataset."""
    path = Path(filepath)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[1] / path

    df = pd.read_csv(path)
    return prepare_search_dataframe(df, source="csv")


def load_sql_data(filters: dict) -> pd.DataFrame:
    """Fetch property data from SQL Server, using native prefilters when possible."""
    query, params = build_sql_query(filters)

    with closing(pyodbc.connect(build_connection_string(), timeout=settings.sql_query_timeout_seconds)) as connection:
        cursor = connection.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        df = pd.DataFrame.from_records(rows, columns=columns)

    return prepare_search_dataframe(df, source="sql")


def build_connection_string() -> str:
    """Build a SQL Server ODBC connection string from configuration."""
    if settings.database_connection_string:
        return settings.database_connection_string

    parts = [
        f"DRIVER={{{settings.sql_server_driver}}}",
        f"SERVER={settings.sql_server_server}",
        f"DATABASE={settings.sql_server_database}",
        f"Encrypt={'yes' if settings.sql_server_encrypt else 'no'}",
        f"TrustServerCertificate={'yes' if settings.sql_server_trust_server_certificate else 'no'}",
        "MARS_Connection=yes",
    ]

    if settings.sql_server_trusted_connection:
        parts.append("Trusted_Connection=yes")
    else:
        parts.append(f"UID={settings.sql_server_username}")
        parts.append(f"PWD={settings.sql_server_password}")

    return ";".join(parts)


def build_sql_query(filters: dict) -> tuple[str, list[object]]:
    """Build a parameterized SQL query that prefilters on native database columns."""
    clauses = ["p.Status = ?"]
    params: list[object] = ["Available"]

    governorate = filters.get("governorate")
    if governorate:
        like = f"%{governorate}%"
        clauses.append("(p.City LIKE ? OR p.District LIKE ? OR p.AddressLine LIKE ? OR p.Description LIKE ?)")
        params.extend([like, like, like, like])

    city = filters.get("city")
    if city:
        clauses.append("p.City LIKE ?")
        params.append(f"%{city}%")

    district = filters.get("district")
    if district:
        clauses.append("p.District LIKE ?")
        params.append(f"%{district}%")

    compound = filters.get("compound")
    if compound:
        clauses.append("p.Title LIKE ?")
        params.append(f"%{compound}%")

    max_price = filters.get("max_price")
    if max_price is not None:
        clauses.append("p.Price <= ?")
        params.append(max_price)

    min_bedrooms = filters.get("min_bedrooms")
    if min_bedrooms is not None:
        clauses.append("p.Bedrooms >= ?")
        params.append(min_bedrooms)

    min_bathrooms = filters.get("min_bathrooms")
    if min_bathrooms is not None:
        clauses.append("p.Bathrooms >= ?")
        params.append(min_bathrooms)

    min_size_sqm = filters.get("min_size_sqm")
    if min_size_sqm is not None:
        clauses.append("p.Area >= ?")
        params.append(min_size_sqm)

    where_clause = " AND ".join(clauses)
    query = f"{SQL_PROPERTY_QUERY} WHERE {where_clause} ORDER BY p.CreatedOnUtc DESC"
    return query, params


def prepare_search_dataframe(data_frame: pd.DataFrame, source: str) -> pd.DataFrame:
    """Normalize either CSV or SQL data into the shared search dataframe contract."""
    df = data_frame.copy()

    if source == "sql":
        df["compound"] = df.get("title", "").fillna("").astype(str)
        df["type"] = df.apply(_infer_property_type, axis=1)
        df["payment_method"] = df.apply(_infer_payment_method, axis=1)
        df["mid_room"] = df.apply(_infer_maid_room, axis=1)
        df["governorate"] = df.apply(_infer_governorate, axis=1)
        df["location"] = df.apply(_build_location, axis=1)
        df["size"] = df.get("size_sqm", 0).fillna(0).astype(str) + " sqm"
        df["available_from"] = ""
        df["down_payment"] = ""

    if "location" not in df.columns:
        df["location"] = df.apply(_build_location, axis=1)

    if "compound" not in df.columns:
        df["compound"] = ""

    if "governorate" not in df.columns:
        df["governorate"] = ""

    if "payment_method" not in df.columns:
        df["payment_method"] = "Unknown"

    if "mid_room" not in df.columns:
        df["mid_room"] = 0

    if "size" not in df.columns and "size_sqm" in df.columns:
        df["size"] = df["size_sqm"].fillna(0).astype(str) + " sqm"

    if "title" not in df.columns:
        df["title"] = df.get("compound", "")

    if "image_url" not in df.columns:
        df["image_url"] = ""

    for column in NUMERIC_COLUMNS:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    if "bathrooms" in df.columns:
        scaled_mask = df["bathrooms"] >= 10
        df.loc[scaled_mask, "bathrooms"] = df.loc[scaled_mask, "bathrooms"] / 10

    if "mid_room" in df.columns:
        df["mid_room"] = df["mid_room"].fillna(0).astype(int)

    for column in STRING_COLUMNS:
        if column in df.columns:
            df[column] = df[column].fillna("").astype(str)

    return df


def _infer_property_type(row: pd.Series) -> str:
    raw_type = str(row.get("type", "") or "").strip()
    text = _combined_text(row)

    for normalized_type, keywords in PROPERTY_TYPE_PATTERNS:
        if any(keyword in text for keyword in keywords):
            return normalized_type

    return raw_type or "Apartment"


def _infer_payment_method(row: pd.Series) -> str:
    text = _combined_text(row)

    if any(keyword in text for keyword in INSTALLMENT_KEYWORDS):
        return "Installments"

    if any(keyword in text for keyword in CASH_KEYWORDS):
        return "Cash"

    return "Unknown"


def _infer_maid_room(row: pd.Series) -> int:
    text = _combined_text(row)
    return int(any(keyword in text for keyword in MAID_ROOM_KEYWORDS))


def _infer_governorate(row: pd.Series) -> str:
    text = _combined_text(row)

    for governorate, keywords in GOVERNORATE_KEYWORDS:
        if any(keyword in text for keyword in keywords):
            return governorate

    city = str(row.get("city", "") or "").strip()
    return city


def _build_location(row: pd.Series) -> str:
    parts: list[str] = []

    for key in ("compound", "district", "city", "governorate"):
        value = str(row.get(key, "") or "").strip()
        if not value:
            continue
        if parts and value.lower() == parts[-1].lower():
            continue
        parts.append(value)

    return ", ".join(parts)


def _combined_text(row: pd.Series) -> str:
    values = (
        row.get("title", ""),
        row.get("description", ""),
        row.get("city", ""),
        row.get("district", ""),
        row.get("address_line", ""),
        row.get("url", ""),
        row.get("type", ""),
    )
    return " ".join(str(value or "") for value in values).lower()
