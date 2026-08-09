from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
cache_dir = ROOT / ".cache" / "matplotlib"
cache_dir.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(cache_dir))
os.environ.setdefault("MPLBACKEND", "Agg")

import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns


ARTIFACTS_DIR = ROOT / "artifacts"
COMPARISON_DIR = ARTIFACTS_DIR / "comparison"
VIS_DIR = ROOT / "visualizations" / "comparison"


def load_metrics() -> pd.DataFrame:
    rows = []
    for metrics_path in sorted(ARTIFACTS_DIR.glob("ml*/metrics.json")):
        with metrics_path.open("r", encoding="utf-8") as file:
            metrics = json.load(file)
        rows.append(
            {
                "model_id": metrics.get("model_id"),
                "task_type": metrics.get("task_type"),
                "algorithm": metrics.get("algorithm"),
                "dataset": metrics.get("dataset_name"),
                "accuracy": metrics.get("accuracy"),
                "precision_weighted": metrics.get("precision_weighted"),
                "recall_weighted": metrics.get("recall_weighted"),
                "f1_weighted": metrics.get("f1_weighted"),
                "f1_macro": metrics.get("f1_macro"),
                "roc_auc": metrics.get("roc_auc"),
                "train_rows": metrics.get("train_rows"),
                "test_rows": metrics.get("test_rows"),
            }
        )
    return pd.DataFrame(rows)


def plot_metrics(df: pd.DataFrame) -> None:
    metric_cols = ["accuracy", "precision_weighted", "recall_weighted", "f1_weighted", "f1_macro", "roc_auc"]
    available = [column for column in metric_cols if column in df.columns and df[column].notna().any()]
    if not available:
        return

    plot_df = df.melt(id_vars=["model_id"], value_vars=available, var_name="metric", value_name="score")
    plt.figure(figsize=(12, 6))
    sns.barplot(data=plot_df, x="metric", y="score", hue="model_id")
    plt.ylim(0, 1)
    plt.title("CVInsight ML Model Metrics")
    plt.xlabel("Metric")
    plt.ylabel("Score")
    plt.xticks(rotation=20, ha="right")
    plt.tight_layout()
    VIS_DIR.mkdir(parents=True, exist_ok=True)
    plt.savefig(VIS_DIR / "metrics_comparison.png", dpi=300, bbox_inches="tight")
    plt.close()


def main() -> int:
    df = load_metrics()
    if df.empty:
        print("No trained model metrics found. Run `python train_all.py` first.")
        return 1

    COMPARISON_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(COMPARISON_DIR / "model_comparison.csv", index=False)
    with (COMPARISON_DIR / "model_comparison.json").open("w", encoding="utf-8") as file:
        json.dump(df.to_dict(orient="records"), file, indent=2)

    plot_metrics(df)
    print(df.to_string(index=False))
    print(f"\nSaved comparison files to {COMPARISON_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
