"""
Baytology Data Preprocessing Pipeline
--------------------------------------
Purpose: Cleans raw real estate data, handles missing values, removes outliers,
and encodes features for similarity search (FAISS).

Outputs:
1. master_dataset.csv: Human-readable data for display in the API.
2. preprocessed_dataset.csv: Scaled, numerical features for the FAISS index.
"""

import os

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler


def load_data():
    candidate_paths = [
        os.path.join("Datasets", "egypt_real_estate_listings.csv"),
        os.path.join("..", "Baytology-chatbot-system", "DataSet", "egypt_real_estate_listings.csv"),
    ]

    dataset_path = next((path for path in candidate_paths if os.path.exists(path)), None)

    if dataset_path is None:
        print("Error: raw dataset not found in the recommendation repo or the chatbot fallback path.")
        raise SystemExit(1)

    data = pd.read_csv(dataset_path)
    print(f"Loaded {len(data)} raw records from {dataset_path}.")
    return data


df = load_data()

# --- 2. ID SYNCHRONIZATION ---
# Ensures every property has a unique, sequential ID for easy lookup.
if "id" not in df.columns:
    df.insert(0, "id", np.arange(1, len(df) + 1))
else:
    df["id"] = np.arange(1, len(df) + 1)

# --- 3. NUMERIC CLEANING & TYPE CASTING ---
# Removes commas and currency symbols, then converts to float.
numeric_columns = ["price", "size", "bedrooms", "bathrooms", "down_payment"]
for col in numeric_columns:
    df[col] = pd.to_numeric(
        df[col].astype(str).str.replace(",", "").str.extract(r"(\d+\.?\d*)")[0],
        errors="coerce",
    )

# --- 4. NULL VALUE MANAGEMENT ---
# Assume missing down_payment is a cash payment (0 down).
df["down_payment"] = df["down_payment"].fillna(0)

# Drop records missing critical information required for search or display.
df = df.dropna(subset=["price", "size", "location"])


def remove_outliers(data, columns):
    """Uses the Interquartile Range (IQR) method to remove unrealistic data points."""
    for col in columns:
        q1 = data[col].quantile(0.05)  # 5th percentile
        q3 = data[col].quantile(0.95)  # 95th percentile
        iqr = q3 - q1
        data = data[(data[col] >= q1 - 1.5 * iqr) & (data[col] <= q3 + 1.5 * iqr)]
    return data


df = remove_outliers(df, ["price", "size"])

# --- 6. CATEGORICAL ENCODING ---
# We create a separate dataframe for features to avoid messing up display data.
df_encoded = df.copy()

# Label Encoding for high-cardinality location data.
le = LabelEncoder()
df_encoded["location"] = le.fit_transform(df_encoded["location"].fillna("Unknown"))

# One-Hot Encoding for small-variety categories (Type and Payment Method).
categorical_columns = ["type", "payment_method"]
df_encoded = pd.get_dummies(df_encoded, columns=categorical_columns)

# Drop non-numeric columns that cannot be processed by the FAISS index.
df_encoded.drop(["available_from", "url", "description"], axis=1, inplace=True, errors="ignore")

# --- 7. FINAL SYNCHRONIZATION (The "Source of Truth" Step) ---
# This ensures that df_encoded and df have the exact same rows in the exact same order.
df_encoded = df_encoded.dropna()
df = df.loc[df_encoded.index].reset_index(drop=True)
df_encoded = df_encoded.reset_index(drop=True)

# --- 8. FEATURE SCALING ---
# Standardizes features (mean=0, variance=1) so one variable doesn't dominate the search.
scaler = StandardScaler()
features_to_scale = df_encoded.columns.drop("id")
df_encoded[features_to_scale] = scaler.fit_transform(df_encoded[features_to_scale])


if __name__ == "__main__":
    os.makedirs("Datasets", exist_ok=True)

    # Save the feature set for FAISS model training.
    df_encoded.to_csv("Datasets/preprocessed_dataset.csv", index=False, encoding="utf-8")

    # Save the master set for API display.
    df.to_csv("Datasets/master_dataset.csv", index=False, encoding="utf-8")

    print("-" * 30)
    print("Preprocessing complete.")
    print(f"Total synchronized rows: {len(df)}")
    print("-" * 30)
