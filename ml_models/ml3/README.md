# ML3 Resume Job Fit Classifier

ML3 trains on `batuhanmtl/job_resume_fit`, a resume-job matching dataset with resume text, job text, required skills, extracted resume skills, and multiple match scores.

## Purpose

This is the closest model to the current CVInsight screening use case because it directly learns from resume-job pairs.

## Train

```bash
cd ml_models
python ml3/train.py
```

The training command runs ML3's own extraction, threshold analysis, preprocessing, algorithm comparison, best-model selection, report generation, and registry update.

## Algorithms Compared

- Logistic Regression
- Complement Naive Bayes
- SGD classifier with logistic loss
- Decision Tree
- Random Forest
- Gradient Boosting

## Label Policy

The default binary target is:

- `Fit` when `ai_match_score >= 70`
- `Not Fit` otherwise

Adjust `positive_threshold` in `config.json` if validation shows the cutoff is too strict or too loose.

The preprocessing step also writes `data/processed/ml3/threshold_analysis.csv` so we can inspect label balance before final product calibration.
