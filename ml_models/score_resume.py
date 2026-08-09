from __future__ import annotations

import argparse
import re
import json
import sys
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent
REGISTRY_PATH = ROOT / "registry" / "models.json"
ML3_NUMERIC_FEATURE_COLUMNS = [
    "dataset_skill_match_score",
    "dataset_fuzzy_match_score",
    "exact_skill_coverage",
    "token_overlap_coverage",
    "resume_word_count",
    "job_word_count",
]


def _stringify_list(values: Any) -> str:
    if not isinstance(values, list):
        return ""
    return " ".join(str(value) for value in values if value)


def _normalize_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = re.sub(r"[^A-Za-z0-9+#.\-/ ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _normalize_skill(value: Any) -> str:
    return _normalize_text(value).lower()


def _skills_from_payload(payload: dict[str, Any]) -> list[str]:
    parsed = (payload.get("resume", {}) or {}).get("parsedData", {}) or {}
    skills = parsed.get("skills")
    if not isinstance(skills, list):
        return []
    return [_normalize_skill(skill) for skill in skills if _normalize_skill(skill)]


def _required_skills_from_payload(payload: dict[str, Any]) -> list[str]:
    job = payload.get("jobDescription", {}) or {}
    values = []
    for key in ["requiredSkills", "preferredSkills", "keywords"]:
        items = job.get(key)
        if isinstance(items, list):
            values.extend(items)
    return [_normalize_skill(skill) for skill in values if _normalize_skill(skill)]


def _token_set(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.\-]{1,}", value.lower())
        if len(token) > 1
    }


def _exact_skill_coverage(resume_skills: list[str], required_skills: list[str]) -> float:
    if not required_skills:
        return 0.0
    resume_set = set(resume_skills)
    matched = sum(1 for skill in required_skills if skill in resume_set)
    return round((matched / len(required_skills)) * 100, 4)


def _text_skill_coverage(resume_text: str, required_skills: list[str]) -> float:
    if not required_skills:
        return 0.0
    lowered_resume = resume_text.lower()
    matched = sum(1 for skill in required_skills if skill and skill in lowered_resume)
    return round((matched / len(required_skills)) * 100, 4)


def _fuzzy_skill_coverage(resume_skills: list[str], required_skills: list[str], resume_text: str) -> float:
    if not required_skills:
        return 0.0

    lowered_resume = resume_text.lower()
    scores = []
    for required_skill in required_skills:
        if required_skill and required_skill in lowered_resume:
            scores.append(100.0)
            continue

        best_ratio = 0.0
        for resume_skill in resume_skills:
            best_ratio = max(best_ratio, SequenceMatcher(None, required_skill, resume_skill).ratio() * 100)
        scores.append(best_ratio)

    return round(sum(scores) / len(scores), 4)


def _token_overlap_coverage(resume_text: str, job_text: str, resume_skills: list[str], required_skills: list[str]) -> float:
    candidate_tokens = _token_set(f"{resume_text} {' '.join(resume_skills)}")
    role_tokens = _token_set(f"{job_text} {' '.join(required_skills)}")
    if not role_tokens:
        return 0.0
    return round((len(candidate_tokens & role_tokens) / len(role_tokens)) * 100, 4)


def _resume_text(payload: dict[str, Any]) -> str:
    resume = payload.get("resume", {})
    parsed = resume.get("parsedData", {}) or {}

    project_text = " ".join(
        " ".join(
            [
                str(project.get("title", "")),
                str(project.get("description", "")),
                _stringify_list(project.get("technologies")),
            ]
        )
        for project in parsed.get("projects", []) or []
        if isinstance(project, dict)
    )
    experience_text = " ".join(
        " ".join(
            [
                str(item.get("title", "")),
                str(item.get("company", "")),
                str(item.get("duration", "")),
                str(item.get("description", "")),
            ]
        )
        for item in parsed.get("experience", []) or []
        if isinstance(item, dict)
    )
    education_text = " ".join(
        " ".join(
            [
                str(item.get("degree", "")),
                str(item.get("institution", "")),
                str(item.get("year", "")),
                str(item.get("rawText", "")),
            ]
        )
        for item in parsed.get("education", []) or []
        if isinstance(item, dict)
    )

    return " ".join(
        [
            str(resume.get("rawText", "")),
            str(parsed.get("name", "")),
            str(parsed.get("summary", "")),
            _stringify_list(parsed.get("skills")),
            project_text,
            experience_text,
            education_text,
        ]
    )


def _job_text(payload: dict[str, Any]) -> str:
    job = payload.get("jobDescription", {}) or {}
    return " ".join(
        [
            str(job.get("title", "")),
            str(job.get("company", "")),
            str(job.get("description", "")),
            _stringify_list(job.get("requiredSkills")),
            _stringify_list(job.get("preferredSkills")),
            _stringify_list(job.get("keywords")),
            _stringify_list(job.get("requirements")),
            _stringify_list(job.get("educationRequirements")),
        ]
    )


def build_ml3_input(payload: dict[str, Any]) -> pd.DataFrame:
    resume_text = _normalize_text(_resume_text(payload))
    job_text = _normalize_text(_job_text(payload))
    resume_skills = _skills_from_payload(payload)
    required_skills = _required_skills_from_payload(payload)
    exact_coverage = _exact_skill_coverage(resume_skills, required_skills)
    text_coverage = _text_skill_coverage(resume_text, required_skills)

    row = {
        "text": _normalize_text(f"{resume_text} {' '.join(resume_skills)} {job_text} {' '.join(required_skills)}"),
        "dataset_skill_match_score": max(exact_coverage, text_coverage),
        "dataset_fuzzy_match_score": _fuzzy_skill_coverage(resume_skills, required_skills, resume_text),
        "exact_skill_coverage": exact_coverage,
        "token_overlap_coverage": _token_overlap_coverage(resume_text, job_text, resume_skills, required_skills),
        "resume_word_count": len(resume_text.split()),
        "job_word_count": len(job_text.split()),
    }
    return pd.DataFrame([row], columns=["text", *ML3_NUMERIC_FEATURE_COLUMNS])


def build_model_input(payload: dict[str, Any], entry: dict[str, Any]):
    task_type = entry["task_type"]
    if task_type == "resume_job_fit" and entry.get("feature_columns"):
        return build_ml3_input(payload)

    resume_text = _resume_text(payload)
    job_text = _job_text(payload)

    if task_type == "resume_job_fit":
        return f"{resume_text} {job_text}"

    return resume_text


def load_registry() -> dict[str, Any]:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError("Model registry not found. Train at least one model first.")

    with REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def score(payload: dict[str, Any]) -> dict[str, Any]:
    registry = load_registry()
    model_id = payload.get("model_id") or payload.get("modelId") or "ml3"
    entry = registry.get(model_id)
    if not entry:
        raise ValueError(f"Unknown model id: {model_id}")

    model = joblib.load(ROOT / entry["artifact_path"])
    model_input = build_model_input(payload, entry)
    prediction_input = model_input if isinstance(model_input, pd.DataFrame) else [model_input]
    prediction = model.predict(prediction_input)[0]

    result: dict[str, Any] = {
        "success": True,
        "model_id": model_id,
        "algorithm": entry.get("algorithm"),
        "dataset_name": entry.get("dataset_name"),
        "task_type": entry["task_type"],
        "prediction": str(prediction),
    }

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(prediction_input)[0]
        result["probabilities"] = {
            str(label): float(probability)
            for label, probability in zip(model.classes_, probabilities)
        }
        if len(model.classes_) == 2:
            result["confidence"] = float(max(probabilities))
        if entry["task_type"] == "resume_job_fit" and "Fit" in list(model.classes_):
            fit_probability = float(probabilities[list(model.classes_).index("Fit")])
            threshold = float(entry.get("decision_threshold") or 0.5)
            threshold = min(max(threshold, 0.01), 0.99)
            calibrated_fit_probability = (
                (fit_probability / threshold) * 0.5
                if fit_probability < threshold
                else 0.5 + (((fit_probability - threshold) / (1 - threshold)) * 0.5)
            )
            result["raw_fit_probability"] = fit_probability
            result["decision_threshold"] = threshold
            result["calibrated_fit_probability"] = float(min(max(calibrated_fit_probability, 0.0), 1.0))
            result["prediction"] = "Fit" if fit_probability >= threshold else "Not Fit"

    return result


def read_payload(path: str | None) -> dict[str, Any]:
    if path:
        with Path(path).open("r", encoding="utf-8") as file:
            return json.load(file)
    return json.load(sys.stdin)


def main() -> int:
    parser = argparse.ArgumentParser(description="Score a resume/job payload using a trained CVInsight ML model.")
    parser.add_argument("--input", help="Optional JSON file. Reads stdin when omitted.")
    args = parser.parse_args()

    try:
        result = score(read_payload(args.input))
        print(json.dumps(result, indent=2))
        return 0
    except Exception as error:
        print(json.dumps({"success": False, "error": str(error)}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
