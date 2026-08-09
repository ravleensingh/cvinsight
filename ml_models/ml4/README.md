# ML4 Structured Resume Role-Family Classifier

ML4 trains on the Kaggle `suriyaganesh/resume-dataset-structured` dataset or an equivalent local extraction of its six CSV tables.

## Purpose

This model uses structured resume tables to learn broad role-family signals from skills, abilities, education, and experience.

## Local Data Layout

Place extracted Kaggle files here:

```text
ml_models/data/raw/ml4/
  01_people.csv
  02_abilities.csv
  03_education.csv
  04_experience.csv
  05_person_skills.csv
  06_skills.csv
```

## Train

```bash
cd ml_models
python ml4/train.py
```

The training command runs ML4's own Kaggle/table extraction, structured table joining, role-family preprocessing, algorithm comparison, best-model selection, report generation, and registry update.

## Algorithms Compared

- Extra Trees
- Random Forest
- Logistic Regression
- SGD classifier with logistic loss
- Complement Naive Bayes
- Decision Tree
