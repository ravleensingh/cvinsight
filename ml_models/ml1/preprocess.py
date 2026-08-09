from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed" / "ml1"
EXTRACTED_PATH = PROCESSED_DIR / "extracted.csv"
PROCESSED_PATH = PROCESSED_DIR / "processed.csv"


def clean_text(value) -> str:
    text = "" if value is None or pd.isna(value) else str(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^A-Za-z0-9+#.\-/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_category(value) -> str:
    label = clean_text(value)
    return re.sub(r"\s+", " ", label.replace("_", " ")).strip().title()


def preprocess_dataset() -> Path:
    if not EXTRACTED_PATH.exists():
        from extract import extract_dataset

        extract_dataset()

    frame = pd.read_csv(EXTRACTED_PATH)
    processed = pd.DataFrame()
    processed["text"] = (
        frame["resume_text"].fillna("").map(clean_text)
        + " "
        + frame["resume_html"].fillna("").map(clean_text)
    ).map(clean_text)
    processed["target"] = frame["category"].map(normalize_category)
    processed = processed[(processed["text"].str.len() >= 80) & (processed["target"].str.len() > 0)]
    processed = processed.drop_duplicates(subset=["text", "target"]).reset_index(drop=True)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    processed.to_csv(PROCESSED_PATH, index=False)
    print(f"ML1 processed rows: {len(processed)}")
    print(f"Saved: {PROCESSED_PATH}")
    return PROCESSED_PATH


if __name__ == "__main__":
    preprocess_dataset()

