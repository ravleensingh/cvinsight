# CVInsight

CVInsight is a full-stack resume screening system that evaluates uploaded resumes against direct role inputs or complete job descriptions. The current version uses trained local ML models for structured resume evaluation, deterministic screening safeguards for sparse inputs, and Groq only for user-facing narrative text after scoring.

## System Overview

The core objective of CVInsight is to reduce manual resume screening overhead while keeping evaluation explainable and maintainable. Unlike basic keyword-matching applicant tracking systems, CVInsight combines local ML fit/category models with deterministic role-alignment, skill, project, experience, ATS, and resume-quality signals.

The application is built with a strong emphasis on security, maintainable architecture, and edge-case handling.

## Key Features

### 1. Advanced Screening Engine
- **Context-Aware Evaluation:** Dynamically scores resumes against either a direct role title (e.g., "Full Stack Developer") or a comprehensive job description.
- **Local ML Evaluation:** Uses four independently trained ML tracks under `ml_models/`, with `ml3` as the default resume-job fit model.
- **Realistic Scoring Algorithms:** Evaluates candidates based on ML fit, Skill Match, Role Alignment, Project Relevance, Experience Fit, ATS Readiness, and Resume Quality.
- **Safe Fallbacks:** Treats weak/short ML inputs as supporting signals only and falls back to deterministic screening for the primary score.
- **Fairness for Entry-Level Candidates:** Incorporates "Fresher Potential" heuristics that prevent candidates from being unfairly penalized for lacking formal work experience if they demonstrate strong foundational projects and education.
- **Actionable Insights:** Generates real, highly contextual strengths and concerns, providing actionable feedback on a candidate's profile.

### 2. Comprehensive Security and Authentication
- **Secure Email Verification:** Uses Nodemailer for genuine OTP-based email verification during registration to ensure authenticity.
- **OAuth Integration:** Supports seamless Google OAuth sign-in.
- **Complete Account Lifecycle Management:** Features secure forgot-password/reset-password flows and a robust account deletion procedure with OTP confirmation and safe database transaction rollbacks.
- **Protected Routing:** Prevents authenticated users from accessing guest routes (like login/signup) and protects dashboard routes from unauthorized access.

### 3. File Processing and Management
- **PDF Extraction:** Efficiently parses and extracts text from uploaded PDF resumes.
- **Data Normalization:** Uses advanced parsing logic to structure unstructured resume text into a predictable JSON schema, gracefully handling varying resume formats.
- **Screening History:** Maintains a stored history of analyzed resumes for future reference.

## Technology Stack

### Frontend
- **Framework:** Next.js / React
- **Routing:** React Router DOM
- **Styling:** Tailwind CSS (Vanilla CSS foundations with responsive design)
- **API Communication:** Axios

### Backend
- **Environment:** Node.js with Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JSON Web Tokens (JWT) and bcryptjs
- **Mail Services:** Nodemailer for transactional emails
- **File Handling:** Multer and pdf-parse
- **Security:** Helmet, CORS, and Express Rate Limit

### Evaluation Engine
- **Evaluation Provider:** Local trained ML models with deterministic screening fallback
- **Narrative Provider:** Groq-compatible text generation for summaries, strengths, concerns, and explanation text after scoring
- **Default Fit Model:** `ml3`, trained on `batuhanmtl/job_resume_fit`
- **Model Governance:** `ml_models/MODEL_GOVERNANCE.md`

## Project Architecture

```text
resume_analyser/
├── backend/
│   ├── config/          # Database and environment configurations
│   ├── controllers/     # Route logic and request handling
│   ├── middlewares/     # Authentication, upload, and error handling
│   ├── models/          # Mongoose database schemas
│   ├── routes/          # Express API route definitions
│   ├── services/        # Core business logic (Screening, Parsing, Email)
│   ├── templates/       # HTML email templates
│   └── server.js        # Application entry point
├── frontend/
    ├── src/
    │   ├── app/         # Next.js entry points
    │   ├── components/  # Reusable UI components
    │   ├── utils/       # API clients and auth helpers
    │   └── views/       # Main screen components (Dashboard, ResumeScreen)
│   ├── package.json
│   └── tailwind.config.js
└── ml_models/
    ├── ml1/             # Independent resume category model track
    ├── ml2/             # Independent resume category model track
    ├── ml3/             # Resume-job fit model track
    ├── ml4/             # Structured resume role-family model track
    ├── score_resume.py  # Backend scoring entrypoint
    └── validate_runtime_scoring.py
```

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- MongoDB database (local or Atlas)
- Local ML model artifacts under `ml_models/`
- Groq API Key for narrative text generation
- SMTP Mail Account (e.g., Gmail App Passwords)
- Google Cloud Console Project (for OAuth credentials)

### 1. Clone and Install
Install dependencies for both the backend and frontend environments.

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../ml_models
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

If model artifacts are not already present locally, train them with:

```bash
cd ml_models
source .venv/bin/activate
python train_all.py
python validate_runtime_scoring.py
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=CVInsight <your_email@gmail.com>

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/auth/google/callback

# Narrative Generation Configuration
MODEL_PROVIDER=groq
MODEL_BASE_URL=https://api.groq.com/openai/v1/chat/completions
MODEL_NAME=llama-3.3-70b-versatile
GROQ_API_KEY=your_api_key

# Resume ML Scoring Configuration
RESUME_ML_MODEL=ml3
ML_MODELS_DIR=../ml_models
ML_PYTHON_PATH=../ml_models/.venv/bin/python
ML_SCORING_TIMEOUT_MS=45000
ENABLE_MODEL_RESUME_EXTRACTION=false
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

### 3. Run the Application

Start the backend server (runs on port 5001 by default):
```bash
cd backend
npm run dev
```

Start the frontend development server (runs on port 3000 by default):
```bash
cd frontend
npm run dev
```

The application will now be accessible at `http://localhost:3000`.

### 4. Verification

Run the main checks before committing or deploying:

```bash
cd backend
npm test

cd ../frontend
npm run lint
npm run build

cd ../ml_models
source .venv/bin/activate
python validate_runtime_scoring.py
python compare_all.py
```

## Production Deployment and Security Considerations

- **Environment Variables:** Never commit `.env` files. The project includes a `.gitignore` to prevent accidental exposure of sensitive keys.
- **Database Indexing:** Ensure MongoDB collections are properly indexed for performance, especially on email fields and resume references.
- **Rate Limiting:** The backend utilizes `express-rate-limit` to prevent brute force attacks on authentication and evaluation endpoints.
- **Model Artifacts:** Raw datasets, trained `model.joblib` files, generated metrics, and visualizations are intentionally git-ignored. Deployments must provision the required artifacts listed in `ml_models/MODEL_GOVERNANCE.md`.
- **Groq Scope:** Groq must remain outside resume scoring. It is used only for final narrative generation after ML/heuristic screening is complete.

## Production deployment notes

For a Vercel frontend and Render backend, use these production variables:

- Frontend (Vercel):
  - `NEXT_PUBLIC_BACKEND_URL=https://cvinsight-d890.onrender.com`
- Backend (Render):
  - `CLIENT_URL=https://cvinsight-delta.vercel.app`
  - `GOOGLE_REDIRECT_URI=https://cvinsight-d890.onrender.com/api/auth/google/callback`
  - `ALLOW_VERCEL_PREVIEWS=true`

Make sure the exact redirect URI above is registered in Google Cloud Console under Authorized redirect URIs.
