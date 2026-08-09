from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd
from datasets import load_dataset


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = ROOT / "data" / "processed" / "ml3"
EXTRACTED_PATH = PROCESSED_DIR / "extracted.csv"

os.environ.setdefault("HF_HOME", str(ROOT / ".cache" / "huggingface"))


def load_config() -> dict:
    with (MODEL_DIR / "config.json").open("r", encoding="utf-8") as file:
        return json.load(file)


def extract_dataset() -> Path:
    config = load_config()
    dataset_name = config["dataset"]["name"]
    frame = load_dataset(dataset_name, split="train").to_pandas()
    required = [
        "resume_text",
        "job_text",
        "category",
        "job_required_skills",
        "resume_skill_list",
        "ai_match_score",
        "skill_string_match_score",
        "fuzzy_match_score",
    ]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(f"ML3 dataset is missing expected columns: {missing}")

    extracted = frame[required].copy()
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    extracted.to_csv(EXTRACTED_PATH, index=False)
    print(f"ML3 extracted rows: {len(extracted)}")
    print(f"Saved: {EXTRACTED_PATH}")
    return EXTRACTED_PATH


if __name__ == "__main__":
    extract_dataset()

