from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
MODEL_ID = "ml4"
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".cache" / "matplotlib"))
os.environ.setdefault("MPLBACKEND", "Agg")
import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import label_binarize
from sklearn.tree import DecisionTreeClassifier

from preprocess import preprocess_dataset


ARTIFACT_DIR = ROOT / "artifacts" / MODEL_ID
VIS_DIR = ROOT / "visualizations" / MODEL_ID
REGISTRY_PATH = ROOT / "registry" / "models.json"


def build_pipeline(model, max_features=50000):
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    max_features=max_features,
                    min_df=3,
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                ),
            ),
            ("model", model),
        ]
    )


def candidate_models() -> dict:
    return {
        "extra_trees": build_pipeline(ExtraTreesClassifier(n_estimators=300, min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1)),
        "random_forest": build_pipeline(RandomForestClassifier(n_estimators=250, max_depth=90, min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1)),
        "logistic_regression": build_pipeline(LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
        "linear_sgd_log_loss": build_pipeline(SGDClassifier(loss="log_loss", class_weight="balanced", random_state=42)),
        "complement_naive_bayes": build_pipeline(ComplementNB()),
        "decision_tree": build_pipeline(DecisionTreeClassifier(max_depth=60, class_weight="balanced", random_state=42), max_features=25000),
    }


def safe_roc_auc(y_test, probabilities, classes):
    if probabilities is None:
        return None
    try:
        y_binary = label_binarize(y_test, classes=classes)
        return float(roc_auc_score(y_binary, probabilities, average="weighted", multi_class="ovr"))
    except ValueError:
        return None


def plot_confusion(y_test, y_pred, classes):
    matrix = confusion_matrix(y_test, y_pred, labels=classes)
    plt.figure(figsize=(10, 8))
    sns.heatmap(matrix, annot=True, fmt="d", cmap="Blues", xticklabels=classes, yticklabels=classes)
    plt.title("ML4 Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    VIS_DIR.mkdir(parents=True, exist_ok=True)
    plt.savefig(VIS_DIR / "confusion_matrix.png", dpi=300, bbox_inches="tight")
    plt.close()


def plot_roc(y_test, probabilities, classes):
    if probabilities is None:
        return False
    try:
        y_binary = label_binarize(y_test, classes=classes)
        plt.figure(figsize=(9, 7))
        for index, label in enumerate(classes):
            fpr, tpr, _ = roc_curve(y_binary[:, index], probabilities[:, index])
            plt.plot(fpr, tpr, linewidth=1.3, label=str(label))
        plt.plot([0, 1], [0, 1], "k--", label="Random")
        plt.title("ML4 ROC Curves")
        plt.xlabel("False Positive Rate")
        plt.ylabel("True Positive Rate")
        plt.legend(fontsize=8)
        plt.grid(alpha=0.25)
        plt.tight_layout()
        plt.savefig(VIS_DIR / "roc_curve.png", dpi=300, bbox_inches="tight")
        plt.close()
        return True
    except ValueError:
        plt.close()
        return False


def update_registry(entry: dict):
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8")) if REGISTRY_PATH.exists() else {}
    registry[MODEL_ID] = entry
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2, sort_keys=True), encoding="utf-8")


def write_model_card(metrics: dict):
    content = f"""# ML4 Structured Resume Role-Family Classifier

- Dataset: suriyaganesh/resume-dataset-structured
- Task: Structured role-family classification from normalized resume tables
- Selected algorithm: {metrics['algorithm']}
- Accuracy: {metrics['accuracy']:.4f}
- Weighted F1: {metrics['f1_weighted']:.4f}
- Macro F1: {metrics['f1_macro']:.4f}
- ROC-AUC: {metrics['roc_auc']}

ML4 is useful as a structured role-family signal. The target is inferred from experience titles, so this track needs careful validation before production weighting.
"""
    (ARTIFACT_DIR / "model_card.md").write_text(content, encoding="utf-8")


def compare_algorithms() -> dict:
    processed_path = preprocess_dataset()
    frame = pd.read_csv(processed_path)
    X_train, X_test, y_train, y_test = train_test_split(
        frame["text"],
        frame["target"],
        test_size=0.2,
        random_state=42,
        stratify=frame["target"],
    )

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    VIS_DIR.mkdir(parents=True, exist_ok=True)
    rows = []
    trained = {}

    for name, pipeline in candidate_models().items():
        print(f"ML4 training {name}...")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        probabilities = pipeline.predict_proba(X_test) if hasattr(pipeline, "predict_proba") else None
        classes = list(pipeline.classes_)
        metrics = {
            "algorithm": name,
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision_weighted": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
            "recall_weighted": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_weighted": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
            "roc_auc": safe_roc_auc(y_test, probabilities, classes),
        }
        rows.append(metrics)
        trained[name] = (pipeline, y_pred, probabilities, classes)

    results = pd.DataFrame(rows).sort_values(["f1_weighted", "accuracy"], ascending=False)
    results.to_csv(ARTIFACT_DIR / "algorithm_comparison.csv", index=False)
    best_name = str(results.iloc[0]["algorithm"])
    best_model, best_pred, best_proba, classes = trained[best_name]
    joblib.dump(best_model, ARTIFACT_DIR / "model.joblib")
    pd.DataFrame(classification_report(y_test, best_pred, output_dict=True, zero_division=0)).transpose().to_csv(ARTIFACT_DIR / "classification_report.csv")
    plot_confusion(y_test, best_pred, classes)
    roc_saved = plot_roc(y_test, best_proba, classes)

    metrics = results.iloc[0].to_dict()
    metrics.update(
        {
            "model_id": MODEL_ID,
            "display_name": "ML4 Structured Resume Role-Family Classifier",
            "task_type": "structured_resume_role_family",
            "dataset_name": "suriyaganesh/resume-dataset-structured",
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "class_count": int(len(classes)),
            "classes": [str(label) for label in classes],
            "roc_curve_saved": roc_saved,
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True), encoding="utf-8")
    write_model_card(metrics)
    update_registry(
        {
            "display_name": "ML4 Structured Resume Role-Family Classifier",
            "task_type": "structured_resume_role_family",
            "algorithm": best_name,
            "dataset_name": "suriyaganesh/resume-dataset-structured",
            "artifact_path": "artifacts/ml4/model.joblib",
            "metrics_path": "artifacts/ml4/metrics.json",
            "classes": [str(label) for label in classes],
        }
    )
    print(results.to_string(index=False))
    print(f"ML4 selected: {best_name}")
    return metrics


if __name__ == "__main__":
    compare_algorithms()
