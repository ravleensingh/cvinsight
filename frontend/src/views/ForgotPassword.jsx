import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaArrowLeft, FaCheckCircle } from "react-icons/fa"
import { authAPI } from "../utils/api"
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator"

const PASSWORD_REGEX = {
  length: /.{8,}/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\/\\;'`~]/
}

function validatePassword(password) {
  if (!PASSWORD_REGEX.length.test(password)) return "Password must be at least 8 characters"
  if (!PASSWORD_REGEX.uppercase.test(password)) return "Password must include at least one uppercase letter"
  if (!PASSWORD_REGEX.lowercase.test(password)) return "Password must include at least one lowercase letter"
  if (!PASSWORD_REGEX.number.test(password)) return "Password must include at least one number"
  if (!PASSWORD_REGEX.special.test(password)) return "Password must include at least one special character"
  return ""
}

// ─── Step 1: Email ────────────────────────────────────────────────────────────
function EmailStep({ onNext }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await authAPI.forgotPassword({ email: email.trim() })
      onNext(email.trim())
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset code")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400 flex items-center justify-center mx-auto mb-4">
          <FaEnvelope className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot password?</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Enter your email and we&apos;ll send you a reset code
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email address
          </label>
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
            />
          </div>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send reset code"}
        </button>
      </form>
    </>
  )
}

// ─── Step 2: OTP ──────────────────────────────────────────────────────────────
function OtpStep({ email, onNext, onBack }) {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState("")
  const [resendMsg, setResendMsg] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError("Enter the 6-digit code"); return }
    setLoading(true)
    setError("")
    // We don't verify OTP here — we pass it to the reset step so it's sent together with the new password
    // This matches notebase's pattern: OTP is verified server-side on reset-password
    onNext(otp)
    setLoading(false)
  }

  const handleResend = async () => {
    setResending(true)
    setError("")
    setResendMsg("")
    try {
      await authAPI.resendOtp({ email, type: "password-reset" })
      setResendMsg("A new code has been sent.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend code")
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <FaEnvelope className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Check your email</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          We sent a 6-digit code to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {resendMsg && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <FaCheckCircle /> {resendMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Verification code
          </label>
          <input
            type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white tracking-[0.4em] text-center focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
          />
        </div>
        <button
          type="submit" disabled={loading || otp.length !== 6}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Verifying..." : "Continue"}
        </button>
      </form>

      <div className="flex items-center justify-between mt-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition">
          <FaArrowLeft className="text-xs" /> Back
        </button>
        <button
          onClick={handleResend} disabled={resending}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-500 transition disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </div>
    </>
  )
}

// ─── Step 3: New Password ─────────────────────────────────────────────────────
function ResetStep({ email, otp, onBack }) {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const pwError = validatePassword(newPassword)
    if (pwError) { setError(pwError); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return }

    setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp, newPassword })
      navigate("/login?message=Password reset successfully. Please sign in.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4">
          <FaLock className="text-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set new password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Choose a strong password for your account
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            New password
          </label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showNew ? "text" : "password"} required
              value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError("") }}
              placeholder="Min 8 chars, upper, lower, number, symbol"
              className={inputClass}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={showNew ? "Hide" : "Show"}>
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {newPassword && <PasswordStrengthIndicator password={newPassword} />}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Confirm new password
          </label>
          <div className="relative">
            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showConfirm ? "text" : "password"} required
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError("") }}
              placeholder="Re-enter your new password"
              className={`${inputClass} ${
                confirmPassword && confirmPassword !== newPassword
                  ? "border-red-400 dark:border-red-500"
                  : confirmPassword && confirmPassword === newPassword
                  ? "border-slate-400 dark:border-slate-500"
                  : ""
              }`}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label={showConfirm ? "Hide" : "Show"}>
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition mt-4">
        <FaArrowLeft className="text-xs" /> Back
      </button>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [step, setStep] = useState("email") // "email" | "otp" | "reset"
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        {step !== "email" && (
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition mb-6"
          >
            <FaArrowLeft className="mr-2 text-xs" /> Back to login
          </Link>
        )}

        {step === "email" && (
          <EmailStep onNext={(e) => { setEmail(e); setStep("otp") }} />
        )}
        {step === "otp" && (
          <OtpStep
            email={email}
            onNext={(o) => { setOtp(o); setStep("reset") }}
            onBack={() => setStep("email")}
          />
        )}
        {step === "reset" && (
          <ResetStep email={email} otp={otp} onBack={() => setStep("otp")} />
        )}

        {step === "email" && (
          <p className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-red-600 dark:text-red-400 hover:text-red-500">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
