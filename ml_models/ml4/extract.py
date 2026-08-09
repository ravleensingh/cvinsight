from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = ROOT / "data" / "processed" / "ml4"
LOCAL_RAW_DIR = ROOT / "data" / "raw" / "ml4"
EXTRACTED_PATH = PROCESSED_DIR / "extracted.csv"

os.environ.setdefault("KAGGLEHUB_CACHE", str(ROOT / ".cache" / "kagglehub"))


def load_config() -> dict:
    with (MODEL_DIR / "config.json").open("r", encoding="utf-8") as file:
        return json.load(file)


def resolve_dataset_dir() -> Path:
    if LOCAL_RAW_DIR.exists():
        return LOCAL_RAW_DIR

    config = load_config()
    slug = config["dataset"].get("kaggle_slug", "suriyaganesh/resume-dataset-structured")
    import kagglehub

    return Path(kagglehub.dataset_download(slug))


def read_csv(base_dir: Path, filename: str) -> pd.DataFrame:
    path = base_dir / filename
    if not path.exists():
        raise FileNotFoundError(f"ML4 expected file not found: {path}")
    return pd.read_csv(path)


def join_text(rows: pd.DataFrame, columns: list[str]) -> str:
    pieces = []
    for _, row in rows[columns].fillna("").iterrows():
        pieces.append(" ".join(str(value) for value in row.values if str(value).strip()))
    return " ".join(pieces)


def extract_dataset() -> Path:
    base_dir = resolve_dataset_dir()
    people = read_csv(base_dir, "01_people.csv")
    abilities = read_csv(base_dir, "02_abilities.csv")
    education = read_csv(base_dir, "03_education.csv")
    experience = read_csv(base_dir, "04_experience.csv")
    person_skills = read_csv(base_dir, "05_person_skills.csv")

    skills_text = person_skills.groupby("person_id")["skill"].apply(lambda values: " ".join(map(str, values))).rename("skills_text")
    abilities_text = abilities.groupby("person_id")["ability"].apply(lambda values: " ".join(map(str, values))).rename("abilities_text")
    education_text = education.groupby("person_id").apply(lambda rows: join_text(rows, ["institution", "program", "location"])).rename("education_text")
    experience_text = experience.groupby("person_id").apply(lambda rows: join_text(rows, ["title", "firm", "location"])).rename("experience_text")
    latest_title = (
        experience.sort_values(["person_id", "start_date"], ascending=[True, False])
        .groupby("person_id")["title"]
        .first()
        .rename("latest_title")
    )

    extracted = (
        people.set_index("person_id")
        .join([skills_text, abilities_text, education_text, experience_text, latest_title], how="left")
        .reset_index()
    )
    columns = ["person_id", "name", "skills_text", "abilities_text", "education_text", "experience_text", "latest_title"]
    extracted = extracted[[column for column in columns if column in extracted.columns]]

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    extracted.to_csv(EXTRACTED_PATH, index=False)
    print(f"ML4 extracted rows: {len(extracted)}")
    print(f"Saved: {EXTRACTED_PATH}")
    return EXTRACTED_PATH


if __name__ == "__main__":
    extract_dataset()

