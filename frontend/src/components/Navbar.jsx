import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import Image from "next/image"
import {
  FaSignOutAlt, FaChartLine,
  FaFileAlt, FaChevronRight, FaTimes, FaCog
} from "react-icons/fa"
import { clearAuth, isAuthenticated, getUser } from "../utils/auth"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isAuth = isAuthenticated()

  useEffect(() => {
    setUser(getUser())

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [location])

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleLogout = () => {
    clearAuth()
    navigate("/login")
    setIsOpen(false)
  }

  const closeMenu = () => setIsOpen(false)

  // Unauthenticated users have NO nav links — only Login/Signup buttons shown in the right section
  // Authenticated users see the full app navigation
  const navLinks = isAuth
    ? [
        { name: "Dashboard", path: "/dashboard", icon: <FaChartLine /> },
        { name: "Resumes",   path: "/resumes",   icon: <FaFileAlt /> },
        { name: "Settings",  path: "/settings",  icon: <FaCog /> },
      ]
    : []

  return (
    <>
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled
            ? "bg-black/95 backdrop-blur-lg shadow-lg shadow-black/30 py-2 border-b border-white/10"
            : "bg-black/80 backdrop-blur-sm py-4 border-b border-white/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo — always links to / for unauth, /dashboard for auth */}
            <Link
              to={isAuth ? "/dashboard" : "/"}
              className="flex items-center space-x-2.5 group"
              onClick={closeMenu}
            >
              <div className="relative">
                <Image
                  src="/cvinsight_mark.svg"
                  alt="CVInsight"
                  width={36}
                  height={36}
                  className="w-9 h-9 transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                CV<span className="text-red-500">Insight</span>
              </span>
            </Link>

            {/* Desktop Navigation — only shown when authenticated */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    location.pathname === link.path
                      ? "text-red-400 bg-white/5"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Desktop Right Section */}
            <div className="hidden lg:flex items-center space-x-3">
              {/* Auth Section */}
              {isAuth ? (
                <div className="flex items-center space-x-3 pl-3 border-l border-white/10">
                  <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-zinc-700 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-medium text-slate-200 max-w-[100px] truncate">
                      {user?.name?.split(" ")[0]}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-all duration-200"
                    title="Logout"
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium text-sm transition-all duration-200 shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:-translate-y-0.5"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-2">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white"
                aria-label="Toggle menu"
              >
                <div className="w-5 h-5 flex flex-col justify-center items-center">
                  <span className={`block h-0.5 w-5 bg-current transform transition-all duration-300 ${isOpen ? "rotate-45 translate-y-0.5" : "-translate-y-1"}`} />
                  <span className={`block h-0.5 w-5 bg-current transform transition-all duration-300 ${isOpen ? "opacity-0" : "opacity-100"}`} />
                  <span className={`block h-0.5 w-5 bg-current transform transition-all duration-300 ${isOpen ? "-rotate-45 -translate-y-0.5" : "translate-y-1"}`} />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-full max-w-sm bg-black shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <Link
              to={isAuth ? "/dashboard" : "/"}
              className="flex items-center space-x-2"
              onClick={closeMenu}
            >
              <Image src="/cvinsight_mark.svg" alt="CVInsight" width={32} height={32} className="w-8 h-8" />
              <span className="text-lg font-bold text-white">
                CV<span className="text-red-500">Insight</span>
              </span>
            </Link>
            <button
              onClick={closeMenu}
              className="p-2 rounded-xl hover:bg-white/5 text-slate-400"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Navigation Links — only when authenticated */}
          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-1">
              {navLinks.map((link, index) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMenu}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 ${
                    location.pathname === link.path
                      ? "bg-white/5 text-red-400"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`text-lg ${location.pathname === link.path ? "text-red-500" : "text-slate-500"}`}>
                      {link.icon}
                    </span>
                    <span className="font-medium">{link.name}</span>
                  </div>
                  <FaChevronRight className={`w-3 h-3 ${location.pathname === link.path ? "text-red-400" : "text-slate-600"}`} />
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="p-5 border-t border-white/10 bg-white/[0.03]">
            {isAuth ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-zinc-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-black/20">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-red-950/40 text-red-300 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-red-950/60 transition-colors border border-red-900/40"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="block w-full py-3 text-center text-slate-200 font-medium bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMenu}
                  className="block w-full py-3 text-center bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 hover:bg-red-700 transition-all"
                >
                  Get Started Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spacer for fixed navbar */}
      <div className="h-[72px]" />
    </>
  )
}
