"""
Baytology: Data Integrity Auditor
---------------------------------
Ensures that the FAISS index, encoded features, and master metadata stay aligned.
"""

import os
import sys

import faiss
import pandas as pd


def check_alignment() -> None:
    current_script_path = os.path.abspath(__file__)
    root_dir = os.path.dirname(os.path.dirname(current_script_path))

    index_path = os.path.join(root_dir, "faiss_index.bin")
    master_path = os.path.join(root_dir, "Datasets", "master_dataset.csv")
    encoded_path = os.path.join(root_dir, "Datasets", "preprocessed_dataset.csv")

    print(f"Project root: {root_dir}")

    files = {
        "FAISS Index": index_path,
        "Master CSV": master_path,
        "Encoded CSV": encoded_path,
    }

    for name, path in files.items():
        if not os.path.exists(path):
            print(f"Missing {name} at: {path}")
            raise SystemExit(1)

    try:
        index = faiss.read_index(index_path)
        df_master = pd.read_csv(master_path, usecols=["id"])
        df_encoded = pd.read_csv(encoded_path, usecols=["id"])

        faiss_count = index.ntotal
        master_count = len(df_master)
        encoded_count = len(df_encoded)
        ids_match = df_master["id"].equals(df_encoded["id"])

        print("-" * 40)
        print("INTEGRITY REPORT")
        print("-" * 40)
        print(f"FAISS Index: {faiss_count} vectors")
        print(f"Master CSV:  {master_count} records")
        print(f"Encoded CSV: {encoded_count} records")

        errors = []
        if faiss_count != master_count:
            errors.append(f"Row mismatch: FAISS ({faiss_count}) != Master ({master_count})")
        if not ids_match:
            errors.append("Sequence mismatch: IDs in master and encoded files do not align.")

        if errors:
            print("-" * 40)
            print("CRITICAL ALIGNMENT ERROR")
            for error in errors:
                print(f"- {error}")
            raise SystemExit(1)

        print("-" * 40)
        print("SUCCESS: data is synchronized.")
        print("-" * 40)
    except Exception as ex:
        print(f"Integrity check failed: {ex}")
        raise SystemExit(1)


if __name__ == "__main__":
    check_alignment()
