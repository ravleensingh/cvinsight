# CVInsight Model Governance

This document defines the minimum checklist for training, validating, and deploying CVInsight resume ML models.

## Production Model Roles

- `ml3` is the primary resume-job fit model because it trains on paired resume/job data.
- `ml1`, `ml2`, and `ml4` are comparison/supporting models for category and role-family behavior.
- Groq must not be used for scoring. It is reserved for narrative generation after structured screening is complete.

## Required Artifacts For Backend Scoring

The backend scoring bridge needs these files at runtime:

- `ml_models/score_resume.py`
- `ml_models/registry/models.json`
- `ml_models/artifacts/<model_id>/model.joblib`
- Python dependencies from `ml_models/requirements.txt`

Raw datasets and intermediate processed CSVs are not required at runtime.

## Retrain Checklist

1. Run the model-specific extraction script.
2. Run the model-specific preprocessing script.
3. Run model-specific training and algorithm comparison.
4. Confirm metrics, classification report, confusion matrix, and ROC curve were regenerated.
5. Run `python compare_all.py`.
6. Run `python validate_runtime_scoring.py`.
7. Smoke-test backend scoring through `scoreResumeWithML`.
8. Update README baseline metrics if selected model metrics changed.

## Promotion Checklist

A model can be promoted as the default only when:

- Its artifact is present in `registry/models.json`.
- Validation metrics are not worse than the previous default on weighted F1, macro F1, and ROC-AUC unless there is a documented reason.
- Runtime validation passes.
- The backend can score the model ID successfully.
- Any decision threshold is stored in the registry, not hardcoded only in app code.

## Known Limitations

- `ml3` performs best on full resume/job pairs similar to its training data.
- Short resumes or sparse job descriptions are treated as supporting ML signals only; deterministic heuristic scoring remains primary in that case.
- Final calibration should be revisited after collecting real app validation examples.
