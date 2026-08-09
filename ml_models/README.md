# CVInsight ML Models

This folder is the local ML foundation for CVInsight resume evaluation. The backend uses these trained models for scoring, classification, and fit prediction, while Groq is reserved for user-facing narrative text after structured screening is complete.

## Design Goals

- Keep four model tracks independent: `ml1`, `ml2`, `ml3`, and `ml4`.
- Keep extraction, cleaning, preprocessing, training, and algorithm comparison separate inside each model folder.
- Use dataset-specific logic instead of a shared generic pipeline.
- Compare multiple predictors per dataset, then save the best-performing baseline.
- Produce a model registry for backend integration and model switching.

See `MODEL_GOVERNANCE.md` for retraining, validation, artifact promotion, and deployment rules.

## Model Tracks

| Track | Dataset source | Task | Algorithms compared |
| --- | --- | --- | --- |
| `ml1` | Hugging Face resume dataset selected from the resume dataset catalog | Resume job-category classification | Logistic Regression, ComplementNB, SGD, Decision Tree, Random Forest |
| `ml2` | `C0ldSmi1e/resume-dataset` | Resume category classification from text, skills, education, and experience | ComplementNB, MultinomialNB, Logistic Regression, SGD, Decision Tree, Random Forest |
| `ml3` | `batuhanmtl/job_resume_fit` | Resume-job fit classification from resume and job text | Logistic Regression, ComplementNB, SGD, Decision Tree, Random Forest, Gradient Boosting |
| `ml4` | Kaggle `suriyaganesh/resume-dataset-structured` or compatible extracted tables | Structured resume role-family classification | Extra Trees, Random Forest, Logistic Regression, SGD, ComplementNB, Decision Tree |

## Folder Contract

Each model folder owns its full workflow:

- `extract.py`: pulls or assembles the source dataset for that model.
- `preprocess.py`: cleans and transforms that specific dataset.
- `compare.py`: trains and compares multiple algorithms for that dataset.
- `train.py`: runs the complete model-specific flow.
- `config.json`: stores dataset and model-track settings.

## Important Dataset Notes

- Dataset 1 in the project brief is a Hugging Face search page, not one fixed dataset. `ml1/config.json` therefore uses a concrete default selected from that catalog, and you can change it later without changing training code.
- Dataset 4 is a Kaggle dataset. Training expects either `KAGGLE_USERNAME` / `KAGGLE_KEY` with `kagglehub`, or a local extracted copy under `ml_models/data/raw/ml4/`.
- Large raw data, trained artifacts, generated metrics, generated registry files, and visualizations are intentionally ignored by git.

## Setup

```bash
cd ml_models
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Train One Model

```bash
python ml1/train.py
python ml2/train.py
python ml3/train.py
python ml4/train.py
```

## Train All Models

```bash
python train_all.py
```

## Compare Models

```bash
python compare_all.py
```

Comparison output is written to:

- `artifacts/comparison/model_comparison.csv`
- `artifacts/comparison/model_comparison.json`
- `visualizations/comparison/metrics_comparison.png`

## Current Baseline Results

These are the first local baselines generated from the current configs. They are starting points for calibration, not final hiring-quality guarantees.

| Model | Selected algorithm | Accuracy | Weighted F1 | Macro F1 | ROC-AUC | Validation rows |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `ml1` | Random Forest | 0.7042 | 0.6789 | 0.6453 | 0.9771 | 497 |
| `ml2` | Random Forest | 0.7301 | 0.7162 | 0.6737 | 0.9711 | 452 |
| `ml3` | Random Forest | 0.8805 | 0.8821 | 0.8149 | 0.9149 | 477 |
| `ml4` | Logistic Regression | 0.6721 | 0.6750 | 0.4173 | 0.9110 | 3660 |

`ml3` is currently the strongest candidate for replacing LLM-based resume-job evaluation because it is trained directly on resume/job-pair fit data. It uses text plus dataset-specific match features and stores a validation-selected fit decision threshold in the registry. `ml1`, `ml2`, and `ml4` are better treated as supporting signals for category alignment, role family, and structured resume understanding.

## Runtime Registry

After training, each model writes metadata to `registry/models.json`. The backend scoring bridge reads that registry and chooses a model with an environment variable or request payload:

```env
RESUME_ML_MODEL=ml3
```

The registry and `artifacts/<model_id>/model.joblib` files are runtime artifacts. They are not committed by default, so deployments must provision them separately or train them during the build/release process.

## Backend Scoring Bridge

`score_resume.py` accepts JSON shaped like the existing backend resume and job objects and returns a model prediction. The Express backend calls this script through `backend/services/mlScoringService.js`.

```bash
python score_resume.py --input examples/sample_payload.json
```

Runtime validation for the integrated scorer:

```bash
python validate_runtime_scoring.py
```

This writes `artifacts/runtime_validation.json` and checks representative high-match and low-match `ml3` dataset rows through the same scoring entrypoint used by the backend.

Expected payload shape:

```json
{
  "model_id": "ml3",
  "resume": {
    "rawText": "candidate resume text",
    "parsedData": {
      "summary": "candidate summary",
      "skills": ["React", "Node.js"]
    }
  },
  "jobDescription": {
    "title": "Full Stack Developer",
    "description": "job description text",
    "requiredSkills": ["React", "Node.js"]
  }
}
```

## Expected Outputs Per Model

Each `mlX` writes:

- `artifacts/mlX/model.joblib`
- `artifacts/mlX/metrics.json`
- `artifacts/mlX/algorithm_comparison.csv`
- `artifacts/mlX/classification_report.csv`
- `artifacts/mlX/model_card.md`
- `visualizations/mlX/confusion_matrix.png`
- `visualizations/mlX/roc_curve.png` when probabilities and labels support ROC-AUC

## Pre-Commit Hygiene

Do not commit:

- `.venv/`
- `.cache/`
- `data/raw/`
- `data/processed/`
- `artifacts/`
- `visualizations/`
- `registry/models.json`
- `__pycache__/`

Commit the source workflows, configs, README files, governance docs, and validation scripts.
