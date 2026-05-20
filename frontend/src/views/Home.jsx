import { Link } from "react-router-dom"
import { FaArrowRight, FaChartLine, FaCheckCircle, FaFileAlt, FaShieldAlt } from "react-icons/fa"

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden pt-24 pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(185,28,28,0.22),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(82,82,91,0.16),_transparent_28%),linear-gradient(180deg,_#020202,_#111111)]" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-red-900/50 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 shadow-sm">
              CVInsight
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Screen resumes with clarity and shortlist with confidence.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
              CVInsight helps you upload resumes, paste live role requirements, evaluate candidate fit, and keep the shortlist process structured from start to finish.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl border border-white/10 bg-white/5 text-slate-100 font-semibold hover:bg-white/10 transition"
              >
                Sign in <FaArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 border-y border-white/10 bg-white/[0.03] backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["Resume parsing", "PDF extraction and structured candidate details"],
            ["Role matching", "Compare each resume against the job description you paste in real time"],
            ["Shortlist review", "Rank candidates with stored screening summaries and clear fit signals"],
            ["Secure accounts", "OTP verification and deletion safeguards"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl bg-white/[0.03] p-5 border border-white/10">
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Resume screening",
                copy: "Upload a resume, extract candidate details, and review strengths, gaps, and overall fit in one place.",
                icon: <FaFileAlt className="text-2xl" />,
              },
              {
                title: "Requirement-aware matching",
                copy: "Paste a fresh job description for every role and let CVInsight infer requirements before scoring fit.",
                icon: <FaChartLine className="text-2xl" />,
              },
              {
                title: "Shortlist decisions",
                copy: "Rank candidate matches, save screening history, and keep the process easy to review later.",
                icon: <FaShieldAlt className="text-2xl" />,
              },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl bg-white/[0.03] p-8 border border-white/10 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-red-950/40 text-red-400 flex items-center justify-center mb-6">
                  {item.icon}
                </div>
                <h2 className="text-xl font-bold text-white">{item.title}</h2>
                <p className="mt-3 text-slate-400 leading-relaxed">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(185,28,28,0.22),_transparent_35%)]" />
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold">Built for clean screening workflows</h2>
                <div className="mt-6 space-y-4">
                  {[
                    "Structured resume parsing with saved candidate fields",
                    "Requirement-aware scoring and shortlist thresholds",
                    "Email verification, reset flows, and deletion safeguards",
                  ].map((item) => (
                    <div key={item} className="flex items-start">
                      <FaCheckCircle className="mt-1 mr-3 text-red-400" />
                      <span className="text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="flex items-center text-red-300 font-semibold">
                  <FaShieldAlt className="mr-2" /> CVInsight
                </div>
                <p className="mt-4 text-slate-200 leading-relaxed">
                  Use CVInsight as the central workflow for upload, requirement analysis, screening, and shortlist review while keeping your process organized and easier to explain.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
