from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
MODEL_ID = "ml3"
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".cache" / "matplotlib"))
os.environ.setdefault("MPLBACKEND", "Agg")
import matplotlib

matplotlib.use("Agg", force=True)

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import ComplementNB
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MaxAbsScaler
from sklearn.tree import DecisionTreeClassifier

from preprocess import preprocess_dataset


ARTIFACT_DIR = ROOT / "artifacts" / MODEL_ID
VIS_DIR = ROOT / "visualizations" / MODEL_ID
REGISTRY_PATH = ROOT / "registry" / "models.json"
TEXT_COLUMN = "text"
NUMERIC_FEATURE_COLUMNS = [
    "dataset_skill_match_score",
    "dataset_fuzzy_match_score",
    "exact_skill_coverage",
    "token_overlap_coverage",
    "resume_word_count",
    "job_word_count",
]
FEATURE_COLUMNS = [TEXT_COLUMN, *NUMERIC_FEATURE_COLUMNS]


def build_pipeline(model, max_features=90000):
    features = ColumnTransformer(
        [
            (
                "text",
                TfidfVectorizer(
                    lowercase=True,
                    strip_accents="unicode",
                    max_features=max_features,
                    min_df=2,
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                ),
                TEXT_COLUMN,
            ),
            ("numeric", MaxAbsScaler(), NUMERIC_FEATURE_COLUMNS),
        ],
        remainder="drop",
    )

    return Pipeline(
        [
            ("features", features),
            ("model", model),
        ]
    )


def candidate_models() -> dict:
    return {
        "logistic_regression": build_pipeline(LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42)),
        "complement_naive_bayes": build_pipeline(ComplementNB()),
        "linear_sgd_log_loss": build_pipeline(SGDClassifier(loss="log_loss", class_weight="balanced", random_state=42)),
        "decision_tree": build_pipeline(DecisionTreeClassifier(max_depth=40, class_weight="balanced", random_state=42), max_features=35000),
        "random_forest": build_pipeline(RandomForestClassifier(n_estimators=250, max_depth=70, min_samples_leaf=2, class_weight="balanced", random_state=42, n_jobs=-1), max_features=35000),
        "gradient_boosting": build_pipeline(GradientBoostingClassifier(random_state=42), max_features=12000),
    }


def probability_for_fit(pipeline, X_test):
    if not hasattr(pipeline, "predict_proba"):
        return None
    probabilities = pipeline.predict_proba(X_test)
    classes = list(pipeline.classes_)
    if "Fit" not in classes:
        return None
    return probabilities[:, classes.index("Fit")]


def plot_confusion(y_test, y_pred):
    matrix = confusion_matrix(y_test, y_pred, labels=["Fit", "Not Fit"])
    plt.figure(figsize=(6, 5))
    sns.heatmap(matrix, annot=True, fmt="d", cmap="Blues", xticklabels=["Fit", "Not Fit"], yticklabels=["Fit", "Not Fit"])
    plt.title("ML3 Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    VIS_DIR.mkdir(parents=True, exist_ok=True)
    plt.savefig(VIS_DIR / "confusion_matrix.png", dpi=300, bbox_inches="tight")
    plt.close()


def plot_roc(y_test, fit_scores):
    if fit_scores is None:
        return False
    y_binary = (pd.Series(y_test).reset_index(drop=True) == "Fit").astype(int)
    fpr, tpr, _ = roc_curve(y_binary, fit_scores)
    auc = roc_auc_score(y_binary, fit_scores)
    plt.figure(figsize=(7, 6))
    plt.plot(fpr, tpr, label=f"Fit AUC = {auc:.4f}")
    plt.plot([0, 1], [0, 1], "k--", label="Random")
    plt.title("ML3 ROC Curve")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.legend()
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(VIS_DIR / "roc_curve.png", dpi=300, bbox_inches="tight")
    plt.close()
    return True


def find_best_fit_threshold(y_test, fit_scores) -> dict:
    if fit_scores is None:
        return {
            "threshold": 0.5,
            "f1": None,
            "precision": None,
            "recall": None,
        }

    rows = []
    for index in range(5, 96):
        threshold = index / 100
        predictions = ["Fit" if score >= threshold else "Not Fit" for score in fit_scores]
        rows.append(
            {
                "threshold": threshold,
                "f1": float(f1_score(y_test, predictions, pos_label="Fit", zero_division=0)),
                "precision": float(precision_score(y_test, predictions, pos_label="Fit", zero_division=0)),
                "recall": float(recall_score(y_test, predictions, pos_label="Fit", zero_division=0)),
            }
        )

    return max(rows, key=lambda row: row["f1"])


def update_registry(entry: dict):
    REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8")) if REGISTRY_PATH.exists() else {}
    registry[MODEL_ID] = entry
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2, sort_keys=True), encoding="utf-8")


def write_model_card(metrics: dict):
    content = f"""# ML3 Resume Job Fit Classifier

- Dataset: batuhanmtl/job_resume_fit
- Task: Binary resume-job fit classification
- Selected algorithm: {metrics['algorithm']}
- Accuracy: {metrics['accuracy']:.4f}
- Weighted F1: {metrics['f1_weighted']:.4f}
- Macro F1: {metrics['f1_macro']:.4f}
- ROC-AUC: {metrics['roc_auc']}
- Validation decision threshold: {metrics.get('decision_threshold', 0.5)}
- Feature schema: text TF-IDF plus {', '.join(NUMERIC_FEATURE_COLUMNS)}

ML3 is the strongest current candidate for replacing LLM-based resume evaluation because it trains on resume-job pairs. This version uses text plus dataset-specific match features. Its threshold and calibration still need product validation.
"""
    (ARTIFACT_DIR / "model_card.md").write_text(content, encoding="utf-8")


def compare_algorithms() -> dict:
    processed_path = preprocess_dataset()
    frame = pd.read_csv(processed_path)
    X_train, X_test, y_train, y_test = train_test_split(
        frame[FEATURE_COLUMNS],
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
        print(f"ML3 training {name}...")
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        fit_scores = probability_for_fit(pipeline, X_test)
        y_binary = (pd.Series(y_test).reset_index(drop=True) == "Fit").astype(int)
        metrics = {
            "algorithm": name,
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision_weighted": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
            "recall_weighted": float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_weighted": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
            "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
            "roc_auc": float(roc_auc_score(y_binary, fit_scores)) if fit_scores is not None else None,
        }
        rows.append(metrics)
        trained[name] = (pipeline, y_pred, fit_scores)

    results = pd.DataFrame(rows).sort_values(["f1_weighted", "roc_auc"], ascending=False)
    results.to_csv(ARTIFACT_DIR / "algorithm_comparison.csv", index=False)
    best_name = str(results.iloc[0]["algorithm"])
    best_model, best_pred, best_scores = trained[best_name]
    best_threshold = find_best_fit_threshold(y_test, best_scores)
    joblib.dump(best_model, ARTIFACT_DIR / "model.joblib")
    pd.DataFrame(classification_report(y_test, best_pred, output_dict=True, zero_division=0)).transpose().to_csv(ARTIFACT_DIR / "classification_report.csv")
    plot_confusion(y_test, best_pred)
    roc_saved = plot_roc(y_test, best_scores)

    metrics = results.iloc[0].to_dict()
    metrics.update(
        {
            "model_id": MODEL_ID,
            "display_name": "ML3 Resume Job Fit Classifier",
            "task_type": "resume_job_fit",
            "dataset_name": "batuhanmtl/job_resume_fit",
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "class_count": 2,
            "classes": ["Fit", "Not Fit"],
            "feature_columns": FEATURE_COLUMNS,
            "numeric_feature_columns": NUMERIC_FEATURE_COLUMNS,
            "decision_threshold": best_threshold["threshold"],
            "decision_threshold_metric": "fit_f1",
            "decision_threshold_scores": best_threshold,
            "roc_curve_saved": roc_saved,
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2, sort_keys=True), encoding="utf-8")
    write_model_card(metrics)
    update_registry(
        {
            "display_name": "ML3 Resume Job Fit Classifier",
            "task_type": "resume_job_fit",
            "algorithm": best_name,
            "dataset_name": "batuhanmtl/job_resume_fit",
            "artifact_path": "artifacts/ml3/model.joblib",
            "metrics_path": "artifacts/ml3/metrics.json",
            "classes": ["Fit", "Not Fit"],
            "feature_columns": FEATURE_COLUMNS,
            "numeric_feature_columns": NUMERIC_FEATURE_COLUMNS,
            "decision_threshold": best_threshold["threshold"],
            "decision_threshold_metric": "fit_f1",
        }
    )
    print(results.to_string(index=False))
    print(f"ML3 selected: {best_name}")
    return metrics


if __name__ == "__main__":
    compare_algorithms()
