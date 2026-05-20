# CVInsight Frontend

Frontend app for `CVInsight`, the resume screening system UI.

## Current Scope

- Public landing page
- Signup, OTP verification, login, forgot-password
- Google OAuth callback flow
- Dashboard with live stats
- Resume upload and review
- Resume screening against a pasted job description
- Settings page for profile, password recovery, and account deletion controls

## Stack

- Next.js
- React
- React Router
- Tailwind CSS
- Axios

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

## Run

```bash
npm install
npm run dev
```

## Notes

- The frontend uses a single black, white, gray, and red theme.
- The earlier saved job-description section, interview flow, and career roadmap pages are removed from the active product.
