# ML2 Structured Resume Category Classifier

ML2 trains on `C0ldSmi1e/resume-dataset`, which includes resume category, skills, education, experience, plain text, and HTML.

## Purpose

This model predicts the resume category using both raw resume text and structured extracted fields.

## Train

```bash
cd ml_models
python ml2/train.py
```

The training command runs ML2's own extraction, preprocessing, algorithm comparison, best-model selection, report generation, and registry update.

## Algorithms Compared

- Complement Naive Bayes
- Multinomial Naive Bayes
- Logistic Regression
- SGD classifier with logistic loss
- Decision Tree
- Random Forest
