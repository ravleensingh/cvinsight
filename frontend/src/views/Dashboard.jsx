import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaFileUpload, FaList, FaChartPie,
  FaSpinner, FaRocket, FaFileAlt, FaCheckCircle,
  FaExclamationTriangle, FaCog
} from "react-icons/fa"
import { userAPI, resumeAPI } from "../utils/api"
import { clearAuth } from "../utils/auth"

export default function Dashboard() {
  const [userData, setUserData] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        // Fetch all in parallel — if one fails it doesn't block the rest
        const [profileRes, resumesRes] = await Promise.allSettled([
          userAPI.getProfile(),
          resumeAPI.getAll()
        ])

        if (cancelled) return

        // Profile is required — 401 means session expired
        if (profileRes.status === "rejected") {
          if (profileRes.reason?.response?.status === 401) {
            clearAuth()
            navigate("/login")
            return
          }
          throw new Error(profileRes.reason?.response?.data?.message || "Failed to load profile")
        }

        const resumes = resumesRes.status === "fulfilled"
          ? (resumesRes.value.data.data || [])
          : []

        // Compute real stats from live data
        const screened = resumes.filter(r =>
          r.status === "screened" || r.status === "shortlisted"
        )
        const shortlisted = resumes.filter(r => r.status === "shortlisted")
        const scores = screened
          .map(r => r.latestScreening?.overallScore)
          .filter(s => typeof s === "number")
        const avgScore = scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null

        setUserData(profileRes.value.data.data)
        setStats({
          totalResumes: resumes.length,
          screened: screened.length,
          shortlisted: shortlisted.length,
          avgScore
        })
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <FaSpinner className="animate-spin text-4xl text-red-600 dark:text-red-400" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-5 rounded-2xl max-w-md text-center shadow">
          <FaExclamationTriangle className="text-2xl mx-auto mb-3" />
          <p className="font-semibold mb-1">Failed to load dashboard</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: "Resumes uploaded",
      value: stats.totalResumes,
      icon: <FaFileAlt />,
      color: "stone",
      empty: "No resumes yet",
      action: () => navigate("/resume/upload")
    },
    {
      label: "Screened",
      value: stats.screened,
      icon: <FaCheckCircle />,
      color: "red",
      empty: stats.totalResumes > 0 ? "None screened yet" : null,
      action: stats.totalResumes > 0 ? () => navigate("/resumes") : null
    },
    {
      label: "Shortlisted",
      value: stats.shortlisted,
      icon: <FaRocket />,
      color: "zinc",
      empty: stats.screened > 0 ? "None shortlisted yet" : null,
      action: stats.screened > 0 ? () => navigate("/resumes") : null
    },
    {
      label: "Avg match score",
      value: stats.avgScore !== null ? `${stats.avgScore}%` : null,
      icon: <FaChartPie />,
      color: "stone",
      empty: "Screen resumes to see score",
      action: null
    }
  ]

  const colorMap = {
    stone: "bg-stone-100 dark:bg-stone-900/30 text-stone-600 dark:text-stone-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    zinc:  "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400"
  }

  const quickActions = [
    {
      label: "Upload Resume",
      desc: "Add a new PDF resume to screen",
      icon: <FaFileUpload className="text-2xl" />,
      color: "red",
      path: "/resume/upload"
    },
    {
      label: "My Resumes",
      desc: `${stats.totalResumes} resume${stats.totalResumes !== 1 ? "s" : ""} in your library`,
      icon: <FaList className="text-2xl" />,
      color: "zinc",
      path: "/resumes"
    },
    {
      label: "Start Screening",
      desc: "Open your resumes and screen them against pasted role requirements",
      icon: <FaChartPie className="text-2xl" />,
      color: "stone",
      path: "/resumes"
    },
    {
      label: "Settings",
      desc: "Manage profile, deletion flow, and account controls",
      icon: <FaCog className="text-2xl" />,
      color: "zinc",
      path: "/settings"
    }
  ]

  const actionColorMap = {
    red: { bg: "bg-red-100 dark:bg-red-900/30", hover: "group-hover:bg-red-600", icon: "text-red-600 dark:text-red-400", blob: "bg-red-50 dark:bg-red-900/10" },
    zinc:    { bg: "bg-zinc-100 dark:bg-zinc-900/30",       hover: "group-hover:bg-zinc-600",    icon: "text-zinc-600 dark:text-zinc-400",    blob: "bg-zinc-50 dark:bg-zinc-900/10" },
    stone:   { bg: "bg-stone-100 dark:bg-stone-900/30",     hover: "group-hover:bg-stone-600",   icon: "text-stone-600 dark:text-stone-400",  blob: "bg-stone-50 dark:bg-stone-900/10" }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Welcome banner */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-100 dark:bg-red-900/20 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-zinc-100 dark:bg-zinc-900/20 rounded-full blur-3xl opacity-50 -translate-x-1/3 translate-y-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="h-20 w-20 bg-gradient-to-br from-red-400 to-zinc-600 rounded-2xl flex items-center justify-center shadow-lg text-white text-3xl font-bold shrink-0">
              {userData?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                Welcome back,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-zinc-600 dark:from-red-400 dark:to-zinc-400">
                  {userData?.name?.split(" ")[0]}
                </span>
              </h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">{userData?.email}</p>
              {stats.totalResumes === 0 && (
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                  Get started by uploading your first resume and screening it against a pasted job description.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              onClick={card.action || undefined}
              className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 ${card.action ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            >
              <div className={`p-3 rounded-xl shrink-0 ${colorMap[card.color]}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{card.label}</p>
                {card.value !== null && card.value !== undefined ? (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{card.empty}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <FaRocket className="text-red-600" /> Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const c = actionColorMap[action.color]
              return (
                <div
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="group bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 cursor-pointer transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 ${c.blob} rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110`} />
                  <div className={`h-12 w-12 ${c.bg} rounded-xl flex items-center justify-center mb-3 relative z-10 ${c.hover} group-hover:text-white transition-colors`}>
                    <span className={`${c.icon} group-hover:text-white transition-colors`}>{action.icon}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm relative z-10">{action.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 relative z-10">{action.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Empty state CTA — only shown when no resumes */}
        {stats.totalResumes === 0 && (
          <div className="bg-gradient-to-r from-red-600 to-zinc-600 rounded-3xl p-8 text-white shadow-xl">
            <h3 className="text-xl font-bold mb-2">Start your first screening</h3>
            <p className="text-red-100 mb-5 max-w-xl">
              Upload a resume, open the screening page, and paste the target job description. CVInsight will score the match, highlight quality gaps, and help you shortlist with more confidence.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/resume/upload")}
                className="px-5 py-2.5 bg-white text-red-700 rounded-xl font-semibold hover:bg-red-50 transition text-sm"
              >
                Upload Resume
              </button>
              <button
                onClick={() => navigate("/resumes")}
                className="px-5 py-2.5 bg-red-700/50 text-white rounded-xl font-semibold hover:bg-red-700/70 transition text-sm border border-white/20"
              >
                Open Resumes
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
