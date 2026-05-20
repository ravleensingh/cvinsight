import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { isAuthenticated } from "./utils/auth"
import Navbar from "./components/Navbar"
import { ToastProvider } from "./components/Toast"
import { ConfirmProvider } from "./components/ConfirmModal"
import Home from "./views/Home"
import Signup from "./views/Signup"
import Login from "./views/Login"
import GoogleAuthCallback from "./views/GoogleAuthCallback"
import VerifyEmail from "./views/VerifyEmail"
import Dashboard from "./views/Dashboard"
import ResumeUpload from "./views/ResumeUpload"
import Resumes from "./views/Resumes"
import ResumeScreen from "./views/ResumeScreen"
import ForgotPassword from "./views/ForgotPassword"
import Settings from "./views/Settings"
import { ThemeProvider } from "./context/ThemeContext"

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 */
function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

/**
 * GuestRoute — redirects authenticated users away from public-only pages
 * (login, signup) to the dashboard so they don't see them twice.
 */
function GuestRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Router>
            <div className="min-h-screen bg-black text-slate-100 transition-colors duration-300">
              <Navbar />
              <Routes>
                {/* Public — landing page (unauthenticated only) */}
                <Route
                  path="/"
                  element={
                    <GuestRoute>
                      <Home />
                    </GuestRoute>
                  }
                />

                {/* Public — auth pages (redirect to dashboard if already logged in) */}
                <Route path="/signup"         element={<GuestRoute><Signup /></GuestRoute>} />
                <Route path="/login"          element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
                <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

                {/* Semi-public — verify-email is accessible without full auth */}
                <Route path="/verify-email" element={<VerifyEmail />} />

                {/* Protected — require authentication */}
                <Route path="/dashboard"                        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/resume/upload"                    element={<ProtectedRoute><ResumeUpload /></ProtectedRoute>} />
                <Route path="/resumes"                          element={<ProtectedRoute><Resumes /></ProtectedRoute>} />
                <Route path="/resume/:id/screen"                element={<ProtectedRoute><ResumeScreen /></ProtectedRoute>} />
                <Route path="/settings"                         element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/"} replace />} />
              </Routes>
            </div>
          </Router>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
