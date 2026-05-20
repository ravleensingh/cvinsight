# CVInsight

CVInsight is an advanced, full-stack Algorithmic Resume Screening System designed to automate and enhance the evaluation of candidate profiles against specific Job Descriptions. Built with modern web technologies and powered by proprietary natural language processing (NLP) heuristics, it provides precise, contextual, and highly analytical candidate assessments.

## System Overview

The core objective of CVInsight is to eliminate the manual overhead of resume screening while maintaining a high degree of accuracy and fairness. Unlike basic keyword-matching applicant tracking systems, CVInsight uses an intelligent rule-based engine to understand the semantic relevance of a candidate's experience, education, and project portfolio. 

The application is built with a strong emphasis on security, maintainable architecture, and edge-case handling.

## Key Features

### 1. Advanced Screening Engine
- **Context-Aware Evaluation:** Dynamically scores resumes against either a direct role title (e.g., "Full Stack Developer") or a comprehensive job description.
- **Realistic Scoring Algorithms:** Evaluates candidates based on Skill Match, Role Alignment, Project Relevance, Experience Fit, ATS Readiness, and Resume Quality.
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
- **Evaluation Provider:** External Evaluation API endpoint

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
└── frontend/
    ├── src/
    │   ├── app/         # Next.js entry points
    │   ├── components/  # Reusable UI components
    │   ├── utils/       # API clients and auth helpers
    │   └── views/       # Main screen components (Dashboard, ResumeScreen)
    ├── package.json
    └── tailwind.config.js
```

## Local Development Setup

### Prerequisites
- Node.js (v18+)
- MongoDB database (local or Atlas)
- Evaluation API Key
- SMTP Mail Account (e.g., Gmail App Passwords)
- Google Cloud Console Project (for OAuth credentials)

### 1. Clone and Install
Install dependencies for both the backend and frontend environments.

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
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
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Evaluation Engine Configuration
MODEL_PROVIDER=groq
MODEL_BASE_URL=https://api.groq.com/openai/v1/chat/completions
MODEL_NAME=llama-3.3-70b-versatile
GROQ_API_KEY=your_api_key
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
```

### 3. Run the Application

Start the backend server (runs on port 5000 by default):
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

## Production Deployment and Security Considerations

- **Environment Variables:** Never commit `.env` files. The project includes a `.gitignore` to prevent accidental exposure of sensitive keys.
- **Database Indexing:** Ensure MongoDB collections are properly indexed for performance, especially on email fields and resume references.
- **Rate Limiting:** The backend utilizes `express-rate-limit` to prevent brute force attacks on authentication and evaluation endpoints.
- **Black-Box Processing:** The system operates under a strict "No-Trace" policy for the end-user. The evaluation algorithms process data server-side, and the user interface presents a native, professional analytics dashboard without exposing the underlying processing engine.
# cartrends
# cartrends
