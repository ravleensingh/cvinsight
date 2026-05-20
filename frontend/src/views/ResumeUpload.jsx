import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaCloudUploadAlt, FaFilePdf, FaSpinner, FaArrowLeft } from "react-icons/fa"
import { resumeAPI } from "../utils/api"
import { clearAuth } from "../utils/auth"

export default function ResumeUpload() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    const isPdf = selectedFile && (
      selectedFile.type === "application/pdf" ||
      selectedFile.name?.toLowerCase().endsWith(".pdf")
    )

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setFile(null)
      setError("Please select a PDF file smaller than 10MB.")
    } else if (isPdf) {
      setFile(selectedFile)
      setError("")
    } else {
      setFile(null)
      setError("Please select a valid PDF file.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a file to upload.")
      return
    }

    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("resume", file)

    try {
      await resumeAPI.upload(formData)
      navigate("/resumes")
    } catch (err) {
      console.error("Upload error:", err)
      if (err.response?.status === 401) {
        clearAuth()
        navigate("/login")
        return
      }
      setError(err.response?.data?.message || "Failed to upload resume. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 mb-8 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div className="bg-red-600 dark:bg-red-900 px-8 py-6">
            <h1 className="text-2xl font-bold text-white flex items-center">
              <FaCloudUploadAlt className="mr-3 text-3xl" />
              Upload Resume
            </h1>
            <p className="text-red-100 mt-2">
              Upload a PDF resume to extract candidate details and prepare it for requirement-based screening.
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-xl hover:border-red-500 dark:hover:border-red-400 transition-colors bg-slate-50 dark:bg-slate-800/50 group cursor-pointer relative">
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={handleFileChange}
                />
                <div className="space-y-2 text-center pointer-events-none">
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FaFilePdf className="mx-auto h-16 w-16 text-red-500 mb-4" />
                      <p className="text-lg font-medium text-slate-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                        Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <FaCloudUploadAlt className="mx-auto h-16 w-16 text-slate-400 group-hover:text-red-500 transition-colors" />
                      <div className="flex text-sm text-slate-600 dark:text-slate-400">
                        <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-red-600 dark:text-red-400 hover:text-red-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-red-500">
                          Upload a file
                        </span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        PDF up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/30 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <FaCloudUploadAlt className="-ml-1 mr-3 h-5 w-5" />
                      Upload Resume
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
