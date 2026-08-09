import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChartPie,
  FaClipboardCheck,
  FaLayerGroup,
  FaExclamationTriangle,
  FaFileAlt,
  FaProjectDiagram,
  FaSpinner,
  FaTimesCircle
} from "react-icons/fa"
import { resumeAPI } from "../utils/api"
import { clearAuth } from "../utils/auth"

const INITIAL_CUSTOM_JD = {
  jobTitle: "",
  company: "",
  jobDescriptionText: "",
  roleDetails: "",
}

const QUICK_ROLE_OPTIONS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "AI Engineer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "UI/UX Designer",
  "DevOps Engineer",
]

const ML_MODEL_OPTIONS = [
  {
    id: "ml3",
    label: "ML3 resume-job fit",
    note: "Recommended default for fit probability.",
  },
  {
    id: "ml1",
    label: "ML1 resume category",
    note: "Compare resume-category classification behavior.",
  },
  {
    id: "ml2",
    label: "ML2 resume category",
    note: "Compare alternate resume dataset behavior.",
  },
  {
    id: "ml4",
    label: "ML4 structured resume",
    note: "Compare structured resume predictor behavior.",
  },
]

function MetricCard({ label, value, tone = "slate" }) {
  const toneClasses = {
    red: "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20",
    stone: "border-stone-200 bg-stone-50 dark:border-stone-800/50 dark:bg-stone-900/20",
    zinc: "border-zinc-200 bg-zinc-50 dark:border-zinc-800/50 dark:bg-zinc-900/20",
    slate: "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/50",
  }

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  )
}

export default function ResumeScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState(null)
  const [customJD, setCustomJD] = useState(INITIAL_CUSTOM_JD)
  const [evaluationMode, setEvaluationMode] = useState("simple")
  const [selectedModelId, setSelectedModelId] = useState("ml3")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [screening, setScreening] = useState(false)
  const [error, setError] = useState("")

  const modeLabel = evaluationMode === "simple" ? "direct" : "complete"

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resumeRes = await resumeAPI.getById(id)
        setResume(resumeRes.data.data)
      } catch (err) {
        if (err.response?.status === 401) {
          clearAuth()
          navigate("/login")
          return
        }
        console.error("Fetch data error:", err)
        setError(err.response?.data?.message || "Failed to load resume details.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate])

  const handleCustomFieldChange = (field, value) => {
    setError("")
    setCustomJD((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleScreen = async () => {
    if (evaluationMode === "simple" && !customJD.jobTitle.trim()) {
      setError("Please choose or enter the role you want to evaluate this resume for.")
      return
    }

    if (evaluationMode === "detailed" && !customJD.jobDescriptionText.trim() && !customJD.jobTitle.trim() && !customJD.roleDetails.trim()) {
      setError("Please provide the job description, or at least a job title with some detailed role information.")
      return
    }

    setScreening(true)
    setError("")
    setResult(null)

    try {
      const payload = {
        jobTitle: customJD.jobTitle,
        company: customJD.company,
        jobDescriptionText: evaluationMode === "detailed" ? customJD.jobDescriptionText : "",
        roleDetails: customJD.roleDetails,
        screeningMode: evaluationMode,
        mlModelId: selectedModelId,
      }
      const response = await resumeAPI.screen(id, payload)
      setResult(response.data.data)
    } catch (err) {
      console.error("Screening error:", err)
      setError(err.response?.data?.message || "Analysis failed. Please try again.")
    } finally {
      setScreening(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <FaSpinner className="animate-spin text-4xl text-red-600 dark:text-red-400" />
          <p className="font-medium text-slate-600 dark:text-slate-400">Loading resume details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-12 transition-colors duration-300 dark:bg-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate("/resumes")}
          className="mb-8 flex items-center text-slate-600 transition-colors hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
        >
          <FaArrowLeft className="mr-2" /> Back to Resumes
        </button>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="bg-red-600 px-8 py-6 dark:bg-red-900">
            <h1 className="flex items-center text-2xl font-bold text-white">
              <FaChartPie className="mr-3 text-3xl" />
              Resume Screening
            </h1>
            <p className="mt-2 text-red-100">
              You choose whether to run a direct role-based evaluation or a complete job-description-based evaluation.
            </p>
          </div>

          <div className="space-y-8 p-8">
            <div>
              <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Selected Resume</h2>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                <p className="font-medium text-slate-800 dark:text-slate-200">{resume?.originalName || resume?.filename}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Uploaded on {new Date(resume?.createdAt).toLocaleDateString()}
                </p>
                {resume?.parsedData?.summary && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {resume.parsedData.summary.slice(0, 220)}
                    {resume.parsedData.summary.length > 220 ? "..." : ""}
                  </p>
                )}
                {resume?.parsedData?.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {resume.parsedData.skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FaLayerGroup className="text-red-500" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Evaluation Mode</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setEvaluationMode("simple")}
                    className={`rounded-2xl border px-5 py-4 text-left transition ${
                      evaluationMode === "simple"
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <p className="font-semibold">Direct Evaluation</p>
                    <p className="mt-1 text-sm opacity-80">For users who want to evaluate the resume using only the target role and a few expectations.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvaluationMode("detailed")}
                    className={`rounded-2xl border px-5 py-4 text-left transition ${
                      evaluationMode === "detailed"
                        ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <p className="font-semibold">Complete Evaluation</p>
                    <p className="mt-1 text-sm opacity-80">For users who want to evaluate the resume with job title, company, and a full job description.</p>
                  </button>
                </div>

                {evaluationMode === "simple" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Role the user is applying for
                      </label>
                      <input
                        list="quick-role-options"
                        type="text"
                        value={customJD.jobTitle}
                        onChange={(event) => handleCustomFieldChange("jobTitle", event.target.value)}
                        placeholder="Type or choose a role like Full Stack Developer"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                      <datalist id="quick-role-options">
                        {QUICK_ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role} />
                        ))}
                      </datalist>
                    </div>
                    <textarea
                      rows={5}
                      value={customJD.roleDetails}
                      onChange={(event) => handleCustomFieldChange("roleDetails", event.target.value)}
                      placeholder="Optional: expected tools, responsibilities, seniority, domain, or what kind of role fit the user wants"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={customJD.jobTitle}
                        onChange={(event) => handleCustomFieldChange("jobTitle", event.target.value)}
                        placeholder="Job Title"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                      <input
                        type="text"
                        value={customJD.company}
                        onChange={(event) => handleCustomFieldChange("company", event.target.value)}
                        placeholder="Company Name"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                    </div>
                    <textarea
                      rows={10}
                      value={customJD.jobDescriptionText}
                      onChange={(event) => handleCustomFieldChange("jobDescriptionText", event.target.value)}
                      placeholder="Paste the full job description here..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                    <textarea
                      rows={5}
                      value={customJD.roleDetails}
                      onChange={(event) => handleCustomFieldChange("roleDetails", event.target.value)}
                      placeholder="Optional: key responsibilities, required tools, seniority, domain, or what kind of candidate the company wants"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Evaluation model
                  </label>
                  <select
                    value={selectedModelId}
                    onChange={(event) => setSelectedModelId(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-transparent focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    {ML_MODEL_OPTIONS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {ML_MODEL_OPTIONS.find((model) => model.id === selectedModelId)?.note}
                  </p>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  CVInsight will infer requirements from the details you provide in this {modeLabel} evaluation, score with the selected trained model, and combine that with resume quality, project relevance, ATS readiness, and fresher potential.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            <button
              onClick={handleScreen}
              disabled={screening || (evaluationMode === "simple"
                ? !customJD.jobTitle.trim()
                : (!customJD.jobDescriptionText.trim() && !customJD.jobTitle.trim() && !customJD.roleDetails.trim()))}
              className="flex w-full items-center justify-center rounded-xl bg-red-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-red-700 hover:shadow-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {screening ? (
                <>
                  <FaSpinner className="mr-3 animate-spin" /> Analyzing Resume...
                </>
              ) : (
                "Analyze Match"
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl animate-fade-in-up dark:border-slate-700 dark:bg-slate-800">
            <div className="p-8">
              <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white">Analysis Results</h2>

              <div className="mb-8 flex flex-col items-center justify-center gap-8 md:flex-row">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <svg className="h-full w-full -rotate-90 transform">
                    <circle
                      className="text-slate-200 dark:text-slate-700"
                      strokeWidth="12"
                      stroke="currentColor"
                      fill="transparent"
                      r="70"
                      cx="80"
                      cy="80"
                    />
                    <circle
                      className={`${
                        (result.overallScore || 0) >= 70
                          ? "text-red-500"
                          : (result.overallScore || 0) >= 40
                            ? "text-stone-500"
                            : "text-red-500"
                      } transition-all duration-1000 ease-out`}
                      strokeWidth="12"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * (result.overallScore || 0)) / 100}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="70"
                      cx="80"
                      cy="80"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">{result.overallScore || 0}%</span>
                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Overall</span>
                  </div>
                </div>

                <div className="grid w-full gap-4 md:grid-cols-2">
                  <MetricCard label="Required Skills Score" value={`${result.scoreBreakdown?.requiredSkillScore || 0}%`} tone="red" />
                  <MetricCard label="Role Alignment" value={`${result.scoreBreakdown?.roleAlignmentScore || 0}%`} tone="zinc" />
                  {result.mlEvaluation?.fitScore !== null && result.mlEvaluation?.fitScore !== undefined && (
                    <MetricCard label="ML Fit Score" value={`${result.mlEvaluation.fitScore}%`} tone="red" />
                  )}
                  <MetricCard label="Project Relevance" value={`${result.scoreBreakdown?.projectRelevanceScore || 0}%`} tone="stone" />
                  <MetricCard label="ATS Readiness" value={`${result.scoreBreakdown?.atsReadinessScore || 0}%`} tone="slate" />
                  <MetricCard label="Resume Quality" value={`${result.scoreBreakdown?.resumeQualityScore || 0}%`} tone="slate" />
                  <MetricCard
                    label={result.scoreBreakdown?.fresherPotentialScore !== null && result.scoreBreakdown?.fresherPotentialScore !== undefined
                      ? "Fresher Potential"
                      : "Experience Found"}
                    value={result.scoreBreakdown?.fresherPotentialScore !== null && result.scoreBreakdown?.fresherPotentialScore !== undefined
                      ? `${result.scoreBreakdown?.fresherPotentialScore || 0}%`
                      : `${result.yearsOfExperience || 0} yrs`}
                    tone="slate"
                  />
                </div>
              </div>

              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                  <h3 className="mb-2 flex items-center font-semibold text-slate-900 dark:text-white">
                    <FaCheckCircle className="mr-2 text-red-500" /> Matched Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.matchedRequiredSkills?.length > 0 ? (
                      result.matchedRequiredSkills.map((skill) => (
                        <span key={skill} className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No direct required-skill matches were detected.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-700/50">
                  <h3 className="mb-2 flex items-center font-semibold text-slate-900 dark:text-white">
                    <FaTimesCircle className="mr-2 text-red-500" /> Missing Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missingRequiredSkills?.length > 0 ? (
                      result.missingRequiredSkills.map((skill) => (
                        <span key={skill} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 dark:bg-stone-900/30 dark:text-stone-300">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">No major required-skill gaps identified.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-700/50">
                  <h3 className="mb-3 flex items-center font-semibold text-slate-900 dark:text-white">
                    <FaProjectDiagram className="mr-2 text-red-500" /> Relevant Projects
                  </h3>
                  {result.matchedProjects?.length > 0 ? (
                    <div className="space-y-3">
                      {result.matchedProjects.map((project) => (
                        <div key={project.title}>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{project.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Relevance score: {project.score}%
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No strongly aligned projects were detected yet.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-700/50">
                  <h3 className="mb-3 flex items-center font-semibold text-slate-900 dark:text-white">
                    <FaClipboardCheck className="mr-2 text-zinc-500" /> Quality Signals
                  </h3>
                  {result.qualitySignals?.length > 0 ? (
                    <div className="space-y-2">
                      {result.qualitySignals.map((item) => (
                        <p key={item} className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No strong quality signals were captured yet.</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-700/50">
                  <h3 className="mb-3 flex items-center font-semibold text-slate-900 dark:text-white">
                    <FaExclamationTriangle className="mr-2 text-stone-500" /> Risk Signals
                  </h3>
                  {result.riskSignals?.length > 0 ? (
                    <div className="space-y-2">
                      {result.riskSignals.map((item) => (
                        <p key={item} className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No major screening risks were detected.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
                <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Screening Summary</h3>
                <div className="rounded-xl border border-red-100 bg-red-50 p-6 leading-relaxed text-slate-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-slate-300">
                  <p className="mb-4 font-semibold text-red-700 dark:text-red-400">{result.recommendation}</p>

                  {result.mlEvaluation && (
                    <div className="mb-5 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/20">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ML evaluation: {result.mlEvaluation.prediction || "completed"}
                      </p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        Model {result.mlEvaluation.modelId || "selected"}{result.mlEvaluation.algorithm ? ` (${result.mlEvaluation.algorithm})` : ""}
                        {result.mlEvaluation.fitScore !== null && result.mlEvaluation.fitScore !== undefined ? ` scored ${result.mlEvaluation.fitScore}% fit.` : "."}
                      </p>
                      {result.mlEvaluation.usedForPrimaryScoring === false && (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                          ML was kept as a supporting signal only because the resume or job input was limited.
                        </p>
                      )}
                      {result.mlEvaluation.rawFitProbability !== null && result.mlEvaluation.rawFitProbability !== undefined && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Raw model fit probability: {Math.round(result.mlEvaluation.rawFitProbability * 100)}%
                          {result.mlEvaluation.decisionThreshold !== null && result.mlEvaluation.decisionThreshold !== undefined
                            ? `, decision threshold: ${Math.round(result.mlEvaluation.decisionThreshold * 100)}%.`
                            : "."}
                        </p>
                      )}
                    </div>
                  )}

                  {result.analysis && (
                    <div className="mb-5 rounded-xl border border-red-200/70 bg-white/70 p-4 dark:border-red-800/40 dark:bg-slate-900/20">
                      <h4 className="mb-2 flex items-center font-semibold text-slate-900 dark:text-white">
                        <FaFileAlt className="mr-2 text-red-600 dark:text-red-400" /> Screening Narrative
                      </h4>
                      <p className="whitespace-pre-line">{result.analysis}</p>
                    </div>
                  )}

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Strengths</h4>
                      {result.strengths?.length > 0 ? (
                        <div className="space-y-1">
                          {result.strengths.map((item) => (
                            <p key={item}>{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p>No major strengths captured yet.</p>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Concerns</h4>
                      {result.concerns?.length > 0 ? (
                        <div className="space-y-1">
                          {result.concerns.map((item) => (
                            <p key={item}>{item}</p>
                          ))}
                        </div>
                      ) : (
                        <p>No major concerns captured.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
                <h3 className="mb-3 font-bold text-slate-900 dark:text-white">Resume Positives and Negatives</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/30">
                    <h4 className="mb-3 flex items-center font-semibold text-slate-900 dark:text-white">
                      <FaCheckCircle className="mr-2 text-red-500" /> Positives
                    </h4>
                    {result.resumePositives?.length > 0 ? (
                      <div className="space-y-2">
                        {result.resumePositives.map((item) => (
                          <p key={item} className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No extra positive insight captured.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/30">
                    <h4 className="mb-3 flex items-center font-semibold text-slate-900 dark:text-white">
                      <FaExclamationTriangle className="mr-2 text-stone-500" /> Negatives
                    </h4>
                    {result.resumeNegatives?.length > 0 ? (
                      <div className="space-y-2">
                        {result.resumeNegatives.map((item) => (
                          <p key={item} className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No extra negative insight captured.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
