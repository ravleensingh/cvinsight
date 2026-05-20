# CVInsight Backend

Backend API for `CVInsight`, a resume screening system that evaluates uploaded resumes against a pasted job description and supports secure shortlist decisions.

## Current Scope

- Email/password authentication with OTP verification
- Google OAuth sign-in
- Forgot-password and reset-password flow
- Refresh-token aware session handling
- Account deletion scheduling with OTP confirmation
- Resume upload and PDF parsing
- Resume screening against a pasted job description
- Requirement inference from raw job description text
- Shortlist scoring and screening history persistence

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer
- Multer
- PDF parsing
- Groq-compatible model integration through OpenAI-style chat completions

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

- role alignment from JD and resume text overlap
- project relevance
- resume quality signals
- ATS-style structure and readability
- education and experience requirements

## Environment Variables

Create `.env` with values similar to:

```env
PORT=5001
MONGO_URI=
FRONTEND_URL=http://localhost:3000
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
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=
```

## Run

```bash
npm install
npm run dev
```

## Notes

- The earlier saved job-description module has been removed from the active backend.
- The earlier interview and career roadmap features are not part of the current product scope.
