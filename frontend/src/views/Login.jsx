import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import Image from "next/image"
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from "react-icons/fa"
import { authAPI } from "../utils/api"
import { setSession } from "../utils/auth"
import GoogleAuthButton from "../components/GoogleAuthButton"

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: true })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const msg = params.get("message")
    const err = params.get("error")
    if (msg) setMessage(msg)

    if (err) {
      const errorMap = {
        oauth_denied: "Google sign-in was cancelled.",
        oauth_not_configured: "Google sign-in is not configured yet.",
        oauth_token_exchange_failed: "Google sign-in could not be completed. Please try again.",
        oauth_email_missing: "No email was returned from Google sign-in.",
        oauth_session_failed: "Could not complete the Google sign-in session.",
        oauth_token_missing: "Google sign-in session is missing required tokens.",
        oauth_callback_error: "An error occurred while completing Google sign-in.",
        oauth_failed: "Google sign-in failed. Please try again."
      }
      setError(errorMap[err] || "An error occurred. Please try again.")
    }
  }, [location.search])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await authAPI.login({ email: formData.email, password: formData.password })
      const { token, refreshToken, user } = response.data.data
      setSession({ token, refreshToken, user, rememberMe: formData.rememberMe })
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        <div className="text-center mb-8">
          <Image src="/cvinsight_mark.svg" alt="CVInsight" width={64} height={64} className="h-16 w-16 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Sign in to continue your screening workflow
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="rememberMe"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
          Need an account?{" "}
          <Link to="/signup" className="font-medium text-red-600 dark:text-red-400 hover:text-red-500">
            Create one
          </Link>
        </p>

        <div className="mt-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="mx-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="mt-4">
            <GoogleAuthButton rememberMe={formData.rememberMe} />
          </div>
        </div>
      </div>
    </div>
  )
}
