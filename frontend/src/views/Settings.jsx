import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaKey,
  FaSave,
  FaShieldAlt,
  FaSpinner,
  FaTrashAlt,
  FaUserCog
} from "react-icons/fa"
import { useToast } from "../components/Toast"
import { useConfirm } from "../components/ConfirmModal"
import { userAPI } from "../utils/api"
import { clearAuth, getUser, setUser } from "../utils/auth"

export default function Settings() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [verifyingDeletion, setVerifyingDeletion] = useState(false)
  const [cancellingDeletion, setCancellingDeletion] = useState(false)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState(null)
  const [name, setName] = useState("")
  const [deletionOtp, setDeletionOtp] = useState("")
  const [showDeletionOtp, setShowDeletionOtp] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await userAPI.getProfile()
        const nextProfile = response.data.data
        setProfile(nextProfile)
        setName(nextProfile?.name || "")
      } catch (err) {
        if (err.response?.status === 401) {
          clearAuth()
          navigate("/login")
          return
        }
        setError(err.response?.data?.message || "Failed to load account settings.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  const deletionDate = useMemo(() => {
    if (!profile?.deletionScheduledAt) return ""

    try {
      return new Date(profile.deletionScheduledAt).toLocaleString()
    } catch {
      return profile.deletionScheduledAt
    }
  }, [profile?.deletionScheduledAt])

  const handleProfileSave = async (event) => {
    event.preventDefault()

    if (!name.trim()) {
      setError("Name is required.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const response = await userAPI.updateProfile({ name: name.trim() })
      const updatedProfile = response.data.data
      setProfile(updatedProfile)

      const currentUser = getUser()
      if (currentUser) {
        setUser({
          ...currentUser,
          name: updatedProfile.name
        })
      }

      toast.success("Profile updated successfully.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.")
    } finally {
      setSaving(false)
    }
  }

  const handleRequestDeletionOtp = async () => {
    const approved = await confirm({
      title: "Start account deletion",
      message: "We will send a verification code to your email before scheduling deletion.",
      confirmText: "Send code",
      cancelText: "Cancel",
      type: "danger"
    })

    if (!approved) return

    setRequestingOtp(true)
    setError("")

    try {
      await userAPI.requestDeletionOtp()
      setShowDeletionOtp(true)
      toast.success("Deletion code sent to your email.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send deletion code.")
    } finally {
      setRequestingOtp(false)
    }
  }

  const handleVerifyDeletionOtp = async (event) => {
    event.preventDefault()

    if (!/^\d{6}$/.test(deletionOtp)) {
      setError("Enter the 6-digit deletion code.")
      return
    }

    setVerifyingDeletion(true)
    setError("")

    try {
      const response = await userAPI.verifyDeletionOtp({ otp: deletionOtp })
      const deletionScheduledAt = response.data.data?.deletionScheduledAt || null
      setProfile((current) => ({
        ...current,
        deletionScheduledAt
      }))
      setShowDeletionOtp(false)
      setDeletionOtp("")
      toast.success("Account deletion scheduled successfully.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify deletion code.")
    } finally {
      setVerifyingDeletion(false)
    }
  }

  const handleCancelDeletion = async () => {
    const approved = await confirm({
      title: "Cancel account deletion",
      message: "Your account will remain active and the scheduled deletion will be removed.",
      confirmText: "Keep account",
      cancelText: "Back",
      type: "warning"
    })

    if (!approved) return

    setCancellingDeletion(true)
    setError("")

    try {
      const response = await userAPI.cancelDeletion()
      setProfile(response.data.data)
      setShowDeletionOtp(false)
      setDeletionOtp("")
      toast.success("Account deletion cancelled.")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel account deletion.")
    } finally {
      setCancellingDeletion(false)
    }
  }

  const handlePasswordRecovery = () => {
    clearAuth()
    navigate("/forgot-password")
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-4xl text-red-600 dark:text-red-400" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        <div className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-zinc-700 px-8 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center">
                <FaUserCog className="text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-red-100 mt-1">Manage your account, recovery options, and deletion controls.</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-5">
                <FaUserCog className="text-red-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile</h2>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:border-transparent focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email address</label>
                    <input
                      type="email"
                      value={profile?.email || ""}
                      disabled
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/70 px-4 py-3 text-slate-500 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <InfoCard label="Account type" value={profile?.isOAuthUser ? "Google-enabled account" : "Email and password account"} />
                  <InfoCard label="Email status" value={profile?.isVerified ? "Verified" : "Pending verification"} />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  {saving ? <FaSpinner className="mr-2 animate-spin" /> : <FaSave className="mr-2" />}
                  Save changes
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-5">
                <FaKey className="text-red-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Password & Recovery</h2>
              </div>

              <p className="text-slate-600 dark:text-slate-400 leading-7">
                Use the recovery flow to reset your password securely. This keeps the experience aligned with the same OTP-based process used on the sign-in side.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePasswordRecovery}
                  className="rounded-xl bg-zinc-900 px-5 py-3 font-semibold text-white hover:bg-black transition"
                >
                  Reset password
                </button>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Back to sign in
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-red-200 dark:border-red-900/40 p-6">
              <div className="flex items-center gap-3 mb-5">
                <FaShieldAlt className="text-red-500" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deletion control</h2>
              </div>

              {profile?.deletionScheduledAt ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    Your account is scheduled for deletion on <span className="font-semibold">{deletionDate}</span>.
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelDeletion}
                    disabled={cancellingDeletion}
                    className="rounded-xl bg-zinc-900 px-5 py-3 font-semibold text-white hover:bg-black transition disabled:opacity-50"
                  >
                    {cancellingDeletion ? "Cancelling..." : "Cancel scheduled deletion"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-600 dark:text-slate-400 leading-7">
                    We use a verification code and grace period before permanent deletion so that accidental removal can be stopped in time.
                  </p>

                  {!showDeletionOtp ? (
                    <button
                      type="button"
                      onClick={handleRequestDeletionOtp}
                      disabled={requestingOtp}
                      className="inline-flex items-center rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {requestingOtp ? <FaSpinner className="mr-2 animate-spin" /> : <FaTrashAlt className="mr-2" />}
                      Send deletion code
                    </button>
                  ) : (
                    <form onSubmit={handleVerifyDeletionOtp} className="space-y-4">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-stone-700 dark:border-stone-800 dark:bg-stone-900/20 dark:text-stone-300">
                        Enter the 6-digit code sent to your email to schedule account deletion.
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={deletionOtp}
                        onChange={(event) => setDeletionOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="w-full max-w-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 tracking-[0.35em] text-center text-slate-900 dark:text-white focus:border-transparent focus:ring-2 focus:ring-red-500"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={verifyingDeletion}
                          className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {verifyingDeletion ? "Verifying..." : "Schedule deletion"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeletionOtp(false)
                            setDeletionOtp("")
                            setError("")
                          }}
                          className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-stone-700 dark:border-stone-800 dark:bg-stone-900/20 dark:text-stone-300">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="mt-1 shrink-0" />
                <p className="leading-7">
                  Common-sense note: use the screening page from any uploaded resume and paste the target job description there. The old saved job-description workflow has been removed to keep the product focused and less confusing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-4 py-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}
