# CVInsight Backend

Backend API for `CVInsight`, a resume screening system that evaluates uploaded resumes against a direct role input or pasted job description and supports secure shortlist decisions.

## Current Scope

- Email/password authentication with OTP verification
- Google OAuth sign-in
- Forgot-password and reset-password flow
- Refresh-token aware session handling
- Account deletion scheduling with OTP confirmation
- Resume upload and PDF parsing
- Resume screening against a pasted job description using trained local ML models plus deterministic fit signals
- Model switching through request payload or `RESUME_ML_MODEL`
- Weak-input ML fallback so sparse resume/job payloads do not dominate the final score
- Requirement inference from raw job description text
- Shortlist scoring and screening history persistence
- Groq-backed narrative generation after structured screening is complete

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer
- Multer
- PDF parsing
- Local Python/scikit-learn resume scoring models
- Groq-compatible text generation through OpenAI-style chat completions

## Main Routes

- `GET /`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/google/session`
- `POST /api/auth/signup`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-otp`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/user/me`
- `PUT /api/user/me`
- `POST /api/user/account-deletion/cancel`
- `POST /api/user/account-deletion/request-otp`
- `POST /api/user/account-deletion/verify-otp`
- `POST /api/resume/upload`
- `GET /api/resume`
- `GET /api/resume/:id`
- `PUT /api/resume/:id`
- `DELETE /api/resume/:id`
- `POST /api/resume/:id/screen`

## Screening Notes

The screening pipeline does not rely only on listed skills. It also considers:

- local ML resume-job fit when the payload is strong enough
- role alignment from JD and resume text overlap
- project relevance
- resume quality signals
- ATS-style structure and readability
- education and experience requirements

Groq is intentionally kept out of resume scoring and disabled for resume parsing by default. It is only used to generate the final narrative explanation from structured ML and heuristic screening results.

`ml3` is the default primary fit model. If resume/job input is too short for reliable ML scoring, the backend records the ML output as a supporting signal and uses deterministic screening for the primary score.

## Environment Variables

Create `.env` with values similar to:

```env
PORT=5001
MONGO_URI=
CLIENT_URL=http://localhost:3000
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback
MODEL_PROVIDER=groq
MODEL_BASE_URL=https://api.groq.com/openai/v1/chat/completions
MODEL_NAME=llama-3.3-70b-versatile
MODEL_API_KEY=
GROQ_API_KEY=
RESUME_ML_MODEL=ml3
ML_MODELS_DIR=../ml_models
ML_PYTHON_PATH=../ml_models/.venv/bin/python
ML_SCORING_TIMEOUT_MS=45000
ENABLE_MODEL_RESUME_EXTRACTION=false
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
FORCE_SECURE_COOKIES=true
ALLOW_VERCEL_PREVIEWS=true
```

When your frontend is deployed to Vercel, `CLIENT_URL` should be set to `https://cvinsight-delta.vercel.app` and `ALLOW_VERCEL_PREVIEWS=true` can be used to allow cross-domain requests from all Vercel app origins.

When deploying cross-domain (frontend on Vercel, backend on Render), make sure `NODE_ENV=production` or set `FORCE_SECURE_COOKIES=true` so OAuth cookies are created with:

- `sameSite=none`
- `secure=true`

This is required for the browser to accept backend cookies from a different domain during the OAuth callback flow.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

The current test suite covers deterministic role-preset expansion, primary ML scoring behavior, and weak-input fallback behavior.

## Local ML Runtime Requirements

The backend scoring bridge launches `ml_models/score_resume.py`. For local development, make sure:

- `ML_MODELS_DIR` points to the `ml_models/` folder.
- `ML_PYTHON_PATH` points to a Python environment with `ml_models/requirements.txt` installed.
- `ml_models/registry/models.json` and the selected `model.joblib` artifact exist locally.

## Notes

- The earlier saved job-description module has been removed from the active backend.
- The earlier interview and career roadmap features are not part of the current product scope.
