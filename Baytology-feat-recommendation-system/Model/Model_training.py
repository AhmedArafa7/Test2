"""
Baytology: FAISS Model Training
-------------------------------
Builds the vector similarity index used by the recommendation API.
"""

import os

import faiss
import pandas as pd


def build_index() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    encoded_path = os.path.join(base_dir, "..", "Datasets", "preprocessed_dataset.csv")
    master_path = os.path.join(base_dir, "..", "Datasets", "master_dataset.csv")
    index_export_path = os.path.join(base_dir, "..", "faiss_index.bin")

    if not os.path.exists(encoded_path):
        print(f"Error: preprocessed data not found at {encoded_path}")
        raise SystemExit(1)

    df_encoded = pd.read_csv(encoded_path)
    features = df_encoded.drop(columns=["id"])
    data = features.values.astype("float32")
    dim = data.shape[1]

    print(f"Features detected: {dim}")
    print(f"Total properties to index: {len(data)}")

    nlist = 100
    quantizer = faiss.IndexFlatL2(dim)
    index = faiss.IndexIVFFlat(quantizer, dim, nlist)

    print("Training vector clusters...")
    index.train(data)
    index.add(data)

    faiss.write_index(index, index_export_path)
    print(f"FAISS index saved to: {index_export_path}")

    test_recommendation(data, index, master_path)


def test_recommendation(data, index, master_path: str) -> None:
    """Simple verification that the trained index can return neighbors."""
    try:
        df_master = pd.read_csv(master_path)
        sample_idx = 0
        query = data[sample_idx].reshape(1, -1)
        distances, indices = index.search(query, 3)

        print("\nVerification test:")
        print(f"Target property: {df_master.iloc[sample_idx]['location']} - {df_master.iloc[sample_idx]['price']} EGP")
        print(f"Top recommendation index: {indices[0][1]}")
        print(f"Top recommendation distance: {distances[0][1]:.4f}")
    except Exception as ex:
        print(f"Verification test failed: {ex}")
        raise SystemExit(1)


if __name__ == "__main__":
    build_index()
