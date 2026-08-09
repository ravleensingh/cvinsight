from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd
from datasets import load_dataset


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__file__).resolve().parent
RAW_DIR = ROOT / "data" / "processed" / "ml1"
EXTRACTED_PATH = RAW_DIR / "extracted.csv"

os.environ.setdefault("HF_HOME", str(ROOT / ".cache" / "huggingface"))


def load_config() -> dict:
    with (MODEL_DIR / "config.json").open("r", encoding="utf-8") as file:
        return json.load(file)


def extract_dataset() -> Path:
    config = load_config()
    dataset_config = config["dataset"]
    dataset = load_dataset(dataset_config["name"], split=dataset_config.get("split", "train"))
    frame = dataset.to_pandas()

    required = ["Resume_str", "Resume_html", "Category"]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(f"ML1 dataset is missing expected columns: {missing}")

    extracted = frame[required].rename(
        columns={
            "Resume_str": "resume_text",
            "Resume_html": "resume_html",
            "Category": "category",
        }
    )
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    extracted.to_csv(EXTRACTED_PATH, index=False)
    print(f"ML1 extracted rows: {len(extracted)}")
    print(f"Saved: {EXTRACTED_PATH}")
    return EXTRACTED_PATH


if __name__ == "__main__":
    extract_dataset()

