import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Image from "next/image"
import { FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa"
import { authAPI } from "../utils/api"
import PasswordStrengthIndicator from "../components/PasswordStrengthIndicator"
import GoogleAuthButton from "../components/GoogleAuthButton"

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

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    const passwordError = validatePassword(formData.password)
    if (passwordError) { setError(passwordError); return }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const response = await authAPI.signup({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      })
      const email = response.data.data?.email || formData.email.trim()
      try { sessionStorage.setItem("_signup_remember", "true") } catch { /* ignore */ }
      setMessage("Verification code sent. Redirecting...")
      setTimeout(() => navigate("/verify-email", { state: { email } }), 700)
    } catch (err) {
      setError(err.response?.data?.message || "Sign up failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full pl-10 pr-12 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
        <div className="text-center mb-8">
          <Image src="/cvinsight_mark.svg" alt="CVInsight" width={64} height={64} className="h-16 w-16 mx-auto mb-5" />
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Start screening resumes smarter with CVInsight
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {message}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Full name
            </label>
            <div className="relative">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="name" name="name" type="text" required
                value={formData.name} onChange={handleChange}
                placeholder="John Doe"
                className={inputClass}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email" name="email" type="email" required
                value={formData.email} onChange={handleChange}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password" name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password} onChange={handleChange}
                placeholder="Min 8 chars, upper, lower, number, symbol"
                className={inputClass}
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
            {formData.password && <PasswordStrengthIndicator password={formData.password} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm password
            </label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword" name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                value={formData.confirmPassword} onChange={handleChange}
                placeholder="Re-enter your password"
                className={`${inputClass} ${
                  formData.confirmPassword && formData.confirmPassword !== formData.password
                    ? "border-red-400 dark:border-red-500 focus:ring-red-400"
                    : formData.confirmPassword && formData.confirmPassword === formData.password
                    ? "border-slate-400 dark:border-slate-500 focus:ring-slate-400"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formData.confirmPassword && formData.confirmPassword !== formData.password && (
              <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Sending code..." : "Create account"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-red-600 dark:text-red-400 hover:text-red-500">
            Sign in
          </Link>
        </p>

        <div className="mt-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
            <span className="mx-3 text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="mt-4">
            <GoogleAuthButton rememberMe={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
