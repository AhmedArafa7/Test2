from __future__ import annotations

import os

import pandas as pd
from dotenv import load_dotenv

from search_engine.data_sources import load_csv_data, load_property_data

load_dotenv()


def load_data(filepath: str):
    """
    Backward-compatible CSV loader used by older scripts and local experiments.
    """
    return load_csv_data(filepath)


def filter_properties(df: pd.DataFrame, filters: dict):
    """
    Takes the full dataframe and the filter dictionary.
    Returns a filtered dataframe using the shared real-estate search rules.
    """
    filtered_df = df.copy()

    if filtered_df.empty:
        return filtered_df

    if filters.get("governorate"):
        val = filters["governorate"]
        filtered_df = filtered_df[
            filtered_df["governorate"].str.contains(val, case=False, na=False)
        ]

    if filters.get("city"):
        val = filters["city"]
        filtered_df = filtered_df[
            filtered_df["city"].str.contains(val, case=False, na=False)
        ]

    if filters.get("district"):
        val = filters["district"]
        filtered_df = filtered_df[
            filtered_df["district"].str.contains(val, case=False, na=False)
        ]

    if filters.get("compound"):
        val = filters["compound"]
        filtered_df = filtered_df[
            filtered_df["compound"].str.contains(val, case=False, na=False)
        ]

    if filters.get("max_price") is not None:
        filtered_df = filtered_df[
            filtered_df["price"] <= filters["max_price"]
        ]

    if filters.get("min_bedrooms") is not None:
        filtered_df = filtered_df[
            filtered_df["bedrooms"] >= filters["min_bedrooms"]
        ]

    if filters.get("min_bathrooms") is not None:
        filtered_df = filtered_df[
            filtered_df["bathrooms"] >= filters["min_bathrooms"]
        ]

    if filters.get("min_size_sqm") is not None:
        filtered_df = filtered_df[
            filtered_df["size_sqm"] >= filters["min_size_sqm"]
        ]

    if filters.get("property_type"):
        property_type = filters["property_type"]
        filtered_df = filtered_df[
            filtered_df["type"].str.lower() == property_type.lower()
        ]

    if filters.get("payment_method"):
        method = filters["payment_method"]
        filtered_df = filtered_df[
            filtered_df["payment_method"].str.lower() == method.lower()
        ]

    if filters.get("mid_room") is True:
        filtered_df = filtered_df[
            filtered_df["mid_room"] == 1
        ]

    return filtered_df


def search_properties(filters: dict, data_frame: pd.DataFrame | None = None, filepath: str | None = None) -> pd.DataFrame:
    """
    Load the relevant property data from the configured source, then apply
    the shared filter logic so entropy/ranking keep the same behavior.
    """
    base_df = data_frame if data_frame is not None else load_property_data(filters=filters, filepath=filepath)
    return filter_properties(base_df, filters)


if __name__ == "__main__":
    try:
        csv_path = os.getenv("CSV_FILE_PATH")

        df = load_data(csv_path)
        print(f"Loaded {len(df)} houses.")

        test_filters = {
            "city": "New Cairo",
            "max_price": 5000000,
            "min_bedrooms": 3,
            "property_type": "Apartment",
        }

        print(f"\nApplying filters: {test_filters}")
        results = search_properties(test_filters, data_frame=df)

        print(f"Found {len(results)} matches.")
        print(results.head(5))

    except FileNotFoundError:
        print("Error: dataset file not found. Please configure the correct path first.")
