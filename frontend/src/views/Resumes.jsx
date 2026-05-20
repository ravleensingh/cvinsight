import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaFilePdf, FaTrash, FaSearch, FaPlus, FaSpinner, FaArrowLeft } from "react-icons/fa"
import { resumeAPI } from "../utils/api"
import { useToast } from "../components/Toast"
import { useConfirm } from "../components/ConfirmModal"
import { clearAuth } from "../utils/auth"

export default function Resumes() {
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const fetchResumes = useCallback(async () => {
    try {
      const response = await resumeAPI.getAll()
      setResumes(response.data.data)
    } catch (err) {
      if (err.response?.status === 401) {
        clearAuth()
        navigate("/login")
        return
      }
      console.error("Fetch resumes error:", err)
      setError(err.response?.data?.message || "Failed to load resumes.")
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    fetchResumes()
  }, [fetchResumes])

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete Resume",
      message: "Are you sure you want to delete this resume? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger"
    })
    
    if (!confirmed) return

    try {
      await resumeAPI.delete(id)
      setResumes((current) => current.filter((resume) => resume._id !== id))
      toast.success("Resume deleted successfully")
    } catch (err) {
      console.error("Delete resume error:", err)
      toast.error(err.response?.data?.message || "Failed to delete resume")
    }
  }

  const filteredResumes = resumes.filter((resume) =>
    (resume?.filename || resume?.originalName || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <FaSpinner className="animate-spin text-4xl text-red-600 dark:text-red-400" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading resumes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 mb-8 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Resumes</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage and analyze your uploaded resumes</p>
          </div>
          <button
            onClick={() => navigate("/resume/upload")}
            className="flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-lg hover:shadow-red-500/30 w-full md:w-auto justify-center"
          >
            <FaPlus className="mr-2" /> Upload New Resume
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 flex items-center">
          <FaSearch className="text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search resumes..."
            className="w-full ml-4 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {filteredResumes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="bg-slate-100 dark:bg-slate-700 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaFilePdf className="text-4xl text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">No resumes found</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {searchTerm ? "Try adjusting your search terms" : "Upload your first resume to get started"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate("/resume/upload")}
                className="text-red-600 dark:text-red-400 font-medium hover:text-red-500"
              >
                Upload Resume
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResumes.map((resume, index) => (
              <div
                key={resume._id}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 group transform hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
                      <FaFilePdf className="text-2xl text-red-500 dark:text-red-400" />
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(resume._id); }}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 truncate pr-4" title={resume.originalName || resume.filename}>
                    {resume.originalName || resume.filename}
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Uploaded {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                    {resume.parsedData?.skills && resume.parsedData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resume.parsedData.skills.slice(0, 3).map((skill, index) => (
                          <span 
                            key={index}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.parsedData.skills.length > 3 && (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-600">
                            +{resume.parsedData.skills.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No skills extracted yet</p>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/resume/${resume._id}/screen`)}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 flex items-center justify-center group-hover:scale-[1.02]"
                  >
                    <FaSearch className="mr-2" /> Screen Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
