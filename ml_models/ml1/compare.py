from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
MODEL_ID = "ml1"
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".cache" / "matplotlib"))
os.environ.setdefault("MPLBACKEND", "Agg")
import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
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


def build_pipeline(model):
    return Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    max_features=60000,
                    min_df=2,
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                ),
            ),
            ("model", model),
        ]
    )


def candidate_models() -> dict:
    return {
        "logistic_regression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42),
        "complement_naive_bayes": ComplementNB(),
        "linear_sgd_log_loss": SGDClassifier(loss="log_loss", class_weight="balanced", random_state=42),
        "decision_tree": DecisionTreeClassifier(max_depth=60, class_weight="balanced", random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=250, max_depth=80, min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1),
    }


def safe_roc_auc(y_test, probabilities, classes):
    if probabilities is None:
        return None
    try:
        if len(classes) == 2:
            return float(roc_auc_score(y_test, probabilities[:, 1]))
        y_binary = label_binarize(y_test, classes=classes)
        return float(roc_auc_score(y_binary, probabilities, average="weighted", multi_class="ovr"))
    except ValueError:
        return None


def plot_confusion(y_test, y_pred, classes):
    matrix = confusion_matrix(y_test, y_pred, labels=classes)
    plt.figure(figsize=(14, 12))
    sns.heatmap(matrix, cmap="Blues", cbar=True)
    plt.title("ML1 Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.xticks(np.arange(len(classes)) + 0.5, classes, rotation=90)
    plt.yticks(np.arange(len(classes)) + 0.5, classes, rotation=0)
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
        for index, label in enumerate(classes[:10]):
            fpr, tpr, _ = roc_curve(y_binary[:, index], probabilities[:, index])
            plt.plot(fpr, tpr, linewidth=1.3, label=str(label))
        plt.plot([0, 1], [0, 1], "k--", label="Random")
        plt.title("ML1 ROC Curves")
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
    registry = {}
    if REGISTRY_PATH.exists():
        registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    registry[MODEL_ID] = entry
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2, sort_keys=True), encoding="utf-8")


def write_model_card(metrics: dict):
    content = f"""# ML1 Resume Category Classifier

- Dataset: Darshan-04/Resume-classification
- Task: Resume category classification
- Selected algorithm: {metrics['algorithm']}
- Accuracy: {metrics['accuracy']:.4f}
- Weighted F1: {metrics['f1_weighted']:.4f}
- Macro F1: {metrics['f1_macro']:.4f}
- ROC-AUC: {metrics['roc_auc']}

ML1 is trained as a broad category alignment signal. It should not be used as the only hiring decision source.
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

    for name, estimator in candidate_models().items():
        print(f"ML1 training {name}...")
        pipeline = build_pipeline(estimator)
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
            "display_name": "ML1 Resume Category Classifier",
            "task_type": "resume_category_classification",
            "dataset_name": "Darshan-04/Resume-classification",
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
            "display_name": "ML1 Resume Category Classifier",
            "task_type": "resume_category_classification",
            "algorithm": best_name,
            "dataset_name": "Darshan-04/Resume-classification",
            "artifact_path": "artifacts/ml1/model.joblib",
            "metrics_path": "artifacts/ml1/metrics.json",
            "classes": [str(label) for label in classes],
        }
    )
    print(results.to_string(index=False))
    print(f"ML1 selected: {best_name}")
    return metrics


if __name__ == "__main__":
    compare_algorithms()
