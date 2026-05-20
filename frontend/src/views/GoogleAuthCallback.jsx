import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FaSpinner } from "react-icons/fa"
import { setSession } from "../utils/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export default function GoogleAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const resolveGoogleSession = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/google/session`, {
          method: "GET",
          credentials: "include",
        })

        if (!response.ok) {
          navigate("/login?error=oauth_session_failed", { replace: true })
          return
        }

        const payload = await response.json()
        const { token, refreshToken, user } = payload.data || {}

        if (!token || !refreshToken || !user) {
          navigate("/login?error=oauth_token_missing", { replace: true })
          return
        }

        const rememberMe = localStorage.getItem("_oauth_remember") === "true"
        localStorage.removeItem("_oauth_remember")
        setSession({ token, refreshToken, user, rememberMe })
        navigate("/dashboard", { replace: true })
      } catch (error) {
        navigate("/login?error=oauth_callback_error", { replace: true })
      }
    }

    resolveGoogleSession()
  }, [navigate])

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <FaSpinner className="mx-auto animate-spin text-4xl text-red-600 dark:text-red-400" />
        <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">Completing Google sign-in</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Securing your session and redirecting you to CVInsight.
        </p>
      </div>
    </div>
  )
}
