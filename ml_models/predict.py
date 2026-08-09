from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent
REGISTRY_PATH = ROOT / "registry" / "models.json"


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        raise FileNotFoundError("Model registry not found. Train at least one model first.")

    with REGISTRY_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a trained CVInsight ML model.")
    parser.add_argument("--model", required=True, help="Model id, for example ml1, ml2, ml3, or ml4.")
    parser.add_argument("--text", required=True, help="Resume text or combined resume-job text.")
    args = parser.parse_args()

    registry = load_registry()
    entry = registry.get(args.model)
    if not entry:
        raise ValueError(f"Unknown model id: {args.model}")

    artifact_path = ROOT / entry["artifact_path"]
    model = joblib.load(artifact_path)
    frame = pd.DataFrame({"text": [args.text]})

    prediction = model.predict(frame["text"])[0]
    result = {"model_id": args.model, "prediction": str(prediction)}

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(frame["text"])[0]
        result["probabilities"] = {
            str(label): float(probability)
            for label, probability in zip(model.classes_, probabilities)
        }

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

