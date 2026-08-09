from __future__ import annotations

import re
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = ROOT / "data" / "processed" / "ml4"
EXTRACTED_PATH = PROCESSED_DIR / "extracted.csv"
PROCESSED_PATH = PROCESSED_DIR / "processed.csv"


def clean_text(value) -> str:
    text = "" if value is None or pd.isna(value) else str(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^A-Za-z0-9+#.\-/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def role_family(value) -> str:
    text = clean_text(value).lower()
    families = {
        "Data": ["data", "analyst", "scientist", "database", "sql", "etl", "warehouse", "bi", "oracle"],
        "Software": ["software", "developer", "engineer", "programmer", "web", "frontend", "backend", "java", "python"],
        "Cloud Devops": ["devops", "cloud", "aws", "azure", "linux", "system administrator", "network", "administrator"],
        "Business": ["business", "manager", "sales", "marketing", "finance", "account", "operations", "purchasing"],
        "Design": ["design", "ui", "ux", "creative", "graphic"],
        "HR Legal": ["hr", "human resources", "recruit", "advocate", "legal"],
        "Healthcare": ["health", "nurse", "medical", "clinical", "fitness"],
        "Engineering": ["mechanical", "civil", "electrical", "manufacturing"],
    }
    for family, markers in families.items():
        if any(marker in text for marker in markers):
            return family
    return "Other"


def preprocess_dataset() -> Path:
    if not EXTRACTED_PATH.exists():
        from extract import extract_dataset

        extract_dataset()

    frame = pd.read_csv(EXTRACTED_PATH)
    processed = pd.DataFrame()
    processed["text"] = (
        frame.get("name", "").fillna("").map(clean_text)
        + " "
        + frame.get("skills_text", "").fillna("").map(clean_text)
        + " "
        + frame.get("abilities_text", "").fillna("").map(clean_text)
        + " "
        + frame.get("education_text", "").fillna("").map(clean_text)
        + " "
        + frame.get("experience_text", "").fillna("").map(clean_text)
    ).map(clean_text)
    processed["target"] = frame.get("latest_title", frame.get("name", "")).map(role_family)
    processed = processed[(processed["text"].str.len() >= 40) & (processed["target"].str.len() > 0)]
    processed = processed.drop_duplicates(subset=["text", "target"]).reset_index(drop=True)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    processed.to_csv(PROCESSED_PATH, index=False)
    print(f"ML4 processed rows: {len(processed)}")
    print(f"Saved: {PROCESSED_PATH}")
    return PROCESSED_PATH


if __name__ == "__main__":
    preprocess_dataset()

