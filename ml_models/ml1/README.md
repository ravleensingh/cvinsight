# ML1 Resume Category Classifier

ML1 trains a resume category classifier from a concrete Hugging Face resume dataset selected from the general resume dataset catalog.

## Purpose

This model predicts the broad resume category or job family from resume text. Later backend integration can use it as one signal for role alignment.

## Train

```bash
cd ml_models
python ml1/train.py
```

The training command runs ML1's own extraction, preprocessing, algorithm comparison, best-model selection, report generation, and registry update.

## Algorithms Compared

- Logistic Regression
- Complement Naive Bayes
- SGD classifier with logistic loss
- Decision Tree
- Random Forest

## Default Source

- Dataset: `Darshan-04/Resume-classification`
- Text columns: `Resume_str`, `Resume_html`
- Target column: `Category`
