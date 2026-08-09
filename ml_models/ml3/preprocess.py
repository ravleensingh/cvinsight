from __future__ import annotations

import json
import re
from ast import literal_eval
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = ROOT / "data" / "processed" / "ml3"
EXTRACTED_PATH = PROCESSED_DIR / "extracted.csv"
PROCESSED_PATH = PROCESSED_DIR / "processed.csv"
THRESHOLD_ANALYSIS_PATH = PROCESSED_DIR / "threshold_analysis.csv"


def load_config() -> dict:
    with (MODEL_DIR / "config.json").open("r", encoding="utf-8") as file:
        return json.load(file)


def clean_text(value) -> str:
    text = "" if value is None or pd.isna(value) else str(value)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^A-Za-z0-9+#.\-/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_list_like(value) -> list[str]:
    if value is None or pd.isna(value):
        return []

    if isinstance(value, list):
        return [clean_text(item).lower() for item in value if clean_text(item)]

    text = str(value).strip()
    if not text:
        return []

    try:
        parsed = literal_eval(text)
        if isinstance(parsed, list):
            return [clean_text(item).lower() for item in parsed if clean_text(item)]
    except (SyntaxError, ValueError):
        pass

    return [clean_text(item).lower() for item in re.split(r",|\n|;", text) if clean_text(item)]


def token_set(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.\-]{1,}", value.lower())
        if len(token) > 1
    }


def exact_skill_coverage(resume_skills, required_skills) -> float:
    required = parse_list_like(required_skills)
    if not required:
        return 0.0

    resume = set(parse_list_like(resume_skills))
    if not resume:
        return 0.0

    matched = sum(1 for skill in required if skill in resume)
    return round((matched / len(required)) * 100, 4)


def token_overlap_coverage(resume_text, resume_skills, job_text, required_skills) -> float:
    candidate_tokens = token_set(f"{resume_text} {' '.join(parse_list_like(resume_skills))}")
    role_tokens = token_set(f"{job_text} {' '.join(parse_list_like(required_skills))}")
    if not role_tokens:
        return 0.0

    return round((len(candidate_tokens & role_tokens) / len(role_tokens)) * 100, 4)


def write_threshold_analysis(scores: pd.Series) -> None:
    rows = []
    for threshold in [50, 55, 60, 65, 70, 75, 80]:
        labels = scores.ge(threshold)
        rows.append(
            {
                "threshold": threshold,
                "fit_count": int(labels.sum()),
                "not_fit_count": int((~labels).sum()),
                "fit_ratio": float(labels.mean()),
            }
        )
    pd.DataFrame(rows).to_csv(THRESHOLD_ANALYSIS_PATH, index=False)


def preprocess_dataset() -> Path:
    if not EXTRACTED_PATH.exists():
        from extract import extract_dataset

        extract_dataset()

    config = load_config()
    threshold = float(config["dataset"].get("positive_threshold", 70))
    frame = pd.read_csv(EXTRACTED_PATH)
    scores = pd.to_numeric(frame["ai_match_score"], errors="coerce")
    write_threshold_analysis(scores.dropna())

    processed = pd.DataFrame()
    processed["resume_text_clean"] = frame["resume_text"].fillna("").map(clean_text)
    processed["job_text_clean"] = frame["job_text"].fillna("").map(clean_text)
    processed["resume_skills_clean"] = frame["resume_skill_list"].fillna("").map(clean_text)
    processed["job_required_skills_clean"] = frame["job_required_skills"].fillna("").map(clean_text)
    processed["text"] = (
        processed["resume_text_clean"]
        + " "
        + processed["resume_skills_clean"]
        + " "
        + processed["job_text_clean"]
        + " "
        + processed["job_required_skills_clean"]
    ).map(clean_text)
    processed["dataset_skill_match_score"] = pd.to_numeric(frame["skill_string_match_score"], errors="coerce").fillna(0.0)
    processed["dataset_fuzzy_match_score"] = pd.to_numeric(frame["fuzzy_match_score"], errors="coerce").fillna(0.0)
    processed["exact_skill_coverage"] = frame.apply(
        lambda row: exact_skill_coverage(row["resume_skill_list"], row["job_required_skills"]),
        axis=1,
    )
    processed["token_overlap_coverage"] = frame.apply(
        lambda row: token_overlap_coverage(
            row["resume_text"],
            row["resume_skill_list"],
            row["job_text"],
            row["job_required_skills"],
        ),
        axis=1,
    )
    processed["resume_word_count"] = processed["resume_text_clean"].map(lambda value: len(value.split()))
    processed["job_word_count"] = processed["job_text_clean"].map(lambda value: len(value.split()))
    processed["target"] = scores.ge(threshold).map({True: "Fit", False: "Not Fit"})
    processed["match_score"] = scores
    processed = processed[(processed["text"].str.len() >= 120) & processed["match_score"].notna()]
    processed = processed.drop_duplicates(subset=["text", "target"]).reset_index(drop=True)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    processed.to_csv(PROCESSED_PATH, index=False)
    print(f"ML3 processed rows: {len(processed)}")
    print(f"Saved: {PROCESSED_PATH}")
    print(f"Saved threshold analysis: {THRESHOLD_ANALYSIS_PATH}")
    return PROCESSED_PATH


if __name__ == "__main__":
    preprocess_dataset()
