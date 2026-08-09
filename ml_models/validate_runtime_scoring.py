from __future__ import annotations

import ast
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from score_resume import score


ROOT = Path(__file__).resolve().parent
OUTPUT_PATH = ROOT / "artifacts" / "runtime_validation.json"


def parse_list(value: Any) -> list[str]:
    if not isinstance(value, str) or not value.strip():
        return []

    try:
        parsed = ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return []

    return parsed if isinstance(parsed, list) else []


def build_ml3_payload(row: pd.Series) -> dict[str, Any]:
    return {
        "model_id": "ml3",
        "resume": {
            "rawText": row.get("resume_text", ""),
            "parsedData": {
                "skills": parse_list(row.get("resume_skill_list", "")),
            },
        },
        "jobDescription": {
            "title": row.get("category", "Target Role"),
            "description": row.get("job_text", ""),
            "requiredSkills": parse_list(row.get("job_required_skills", "")),
        },
    }


def validate_ml3() -> dict[str, Any]:
    extracted_path = ROOT / "data" / "processed" / "ml3" / "extracted.csv"
    if not extracted_path.exists():
        return {
            "model_id": "ml3",
            "success": False,
            "error": "ML3 extracted dataset not found. Run ml3/train.py first.",
        }

    frame = pd.read_csv(extracted_path)
    high_match = frame[frame["ai_match_score"] >= 85].sample(1, random_state=7).iloc[0]
    low_match = frame[frame["ai_match_score"] <= 25].sample(1, random_state=7).iloc[0]

    high_result = score(build_ml3_payload(high_match))
    low_result = score(build_ml3_payload(low_match))
    high_fit = high_result.get("calibrated_fit_probability", high_result.get("raw_fit_probability", 0)) * 100
    low_fit = low_result.get("calibrated_fit_probability", low_result.get("raw_fit_probability", 0)) * 100

    return {
        "model_id": "ml3",
        "success": high_result.get("prediction") == "Fit" and low_result.get("prediction") == "Not Fit",
        "checks": [
            {
                "name": "high_match_dataset_row",
                "source_ai_match_score": float(high_match["ai_match_score"]),
                "prediction": high_result.get("prediction"),
                "fit_score": round(high_fit, 2),
                "expected": "Fit",
            },
            {
                "name": "low_match_dataset_row",
                "source_ai_match_score": float(low_match["ai_match_score"]),
                "prediction": low_result.get("prediction"),
                "fit_score": round(low_fit, 2),
                "expected": "Not Fit",
            },
        ],
    }


def main() -> int:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "checks": [validate_ml3()],
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if all(check.get("success") for check in report["checks"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
