# ML Evaluation Implementation Plan

This plan separates resume evaluation into traditional ML scoring and LLM-generated explanation. Groq should be used for narrative only after deterministic/model-based evaluation has produced structured signals.

## Phase 1: Foundation

Status: complete in this pass.

- Create `ml_models/` with isolated Python dependencies.
- Keep four independent model tracks: `ml1`, `ml2`, `ml3`, `ml4`.
- Add separate dataset-specific extraction, preprocessing, training, and algorithm-comparison files inside each model folder.
- Train first baseline artifacts for all four tracks.
- Generate per-model metrics, reports, confusion matrices, ROC curves, and a comparison table.

## Phase 2: Data Quality And Calibration

Status: next.

- Inspect class distributions for every dataset and record them in metrics.
- Review whether each target label matches the real product objective.
- Tune `ml3` fit threshold because `ai_match_score >= 70` creates an imbalanced target.
- Add top-k category metrics for `ml1` and `ml2`, since category labels can overlap semantically.
- Add confidence calibration for `ml3` before using probabilities as product scores.
- Decide whether `ml4` should remain role-family classification or become a structured quality score model.

## Phase 3: Backend Integration

Status: enabled in this pass.

- Use `score_resume.py` as the first backend bridge.
- Add a backend service that selects a model from `RESUME_ML_MODEL`, sends resume/job JSON to the Python scorer, and reads structured output.
- Keep the existing heuristic scoring as a fallback while model-based scoring is verified.
- Store ML outputs separately from Groq narrative fields so scoring and text generation remain auditable.

## Phase 4: Product Scoring Contract

Status: partially enabled.

- Convert model output into the existing backend response shape:
  - `overallScore`
  - `scoreBreakdown`
  - `matchedRequiredSkills`
  - `missingRequiredSkills`
  - `qualitySignals`
  - `riskSignals`
  - `recommendation`
- Groq receives only the structured model/heuristic output and resume summary fields, then generates user-friendly prose.
- Add `evaluationProvider: "ml"` or similar metadata to persisted screenings. Status: complete.

## Phase 5: Reliability

Status: planned.

- Add tests for data loaders using small fixture CSVs.
- Add tests for score bridge JSON input/output.
- Add backend integration tests with a fake scorer process.
- Add a rollback path to heuristic scoring if Python scoring fails.
- Add model version metadata to every screening result.
