import { useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaCheckCircle, FaEnvelope, FaSpinner } from "react-icons/fa"
import { authAPI } from "../utils/api"
import { setSession } from "../utils/auth"

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()

  // Prefer email from router state (Signup passes it), fall back to query params
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialEmail = location.state?.email || params.get("email") || ""

  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await authAPI.verifyEmail({
        email: email.trim(),
        otp: otp.trim(),
      })

      const { token, refreshToken, user } = response.data.data

      // Read the rememberMe flag stored during signup, default true
      let rememberMe = true
      try {
        const stored = sessionStorage.getItem("_signup_remember")
        if (stored !== null) {
          rememberMe = stored === "true"
          sessionStorage.removeItem("_signup_remember")
        }
      } catch {
        // ignore storage errors
      }

      setSession({ token, refreshToken, user, rememberMe })
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError("")
    setMessage("")

    try {
      await authAPI.resendOtp({
        email: email.trim(),
        type: "signup",
      })
      setMessage("A new verification code has been sent.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        <Link
          to="/signup"
          className="inline-flex items-center text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors mb-6"
        >
          <FaArrowLeft className="mr-2" /> Back
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
            <FaEnvelope className="text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify your email</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Enter the 6-digit code sent to your inbox to activate CVInsight.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center">
            <FaCheckCircle className="mr-2" /> {message}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white tracking-[0.35em] text-center focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <><FaSpinner className="animate-spin mr-2" /> Verifying...</> : "Verify and continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email.trim()}
          className="w-full mt-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resending ? "Resending..." : "Resend code"}
        </button>
      </div>
    </div>
  )
}
