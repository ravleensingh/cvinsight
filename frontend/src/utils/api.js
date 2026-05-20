import axios from "axios"
import { clearAuth, getRefreshToken, getToken } from "./auth"

// NEXT_PUBLIC_ prefix is correct for Next.js — env vars are inlined at build time
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach access token and refresh token to every request
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    const refreshToken = getRefreshToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (refreshToken) {
      config.headers["x-refresh-token"] = refreshToken
    }

    return config
  },
  (error) => Promise.reject(error),
)

// Handle rotated tokens from response headers and auto-logout on 401
api.interceptors.response.use(
  (response) => {
    const nextAccessToken = response.headers["x-access-token"]
    const nextRefreshToken = response.headers["x-refresh-token"]

    if (nextAccessToken) {
      const storage = localStorage.getItem("token") ? localStorage : sessionStorage
      storage.setItem("token", nextAccessToken)
    }

    if (nextRefreshToken) {
      const storage = localStorage.getItem("refreshToken") ? localStorage : sessionStorage
      storage.setItem("refreshToken", nextRefreshToken)
    }

    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAuth()
    }
    return Promise.reject(error)
  },
)

export const authAPI = {
  signup:         (data) => api.post("/api/auth/signup", data),
  verifyEmail:    (data) => api.post("/api/auth/verify-email", data),
  resendOtp:      (data) => api.post("/api/auth/resend-otp", data),
  login:          (data) => api.post("/api/auth/login", data),
  forgotPassword: (data) => api.post("/api/auth/forgot-password", data),
  resetPassword:  (data) => api.post("/api/auth/reset-password", data),
  logout:         ()     => { clearAuth() },
}

export const userAPI = {
  getProfile:         ()     => api.get("/api/user/me"),
  updateProfile:      (data) => api.put("/api/user/me", data),
  requestDeletionOtp: ()     => api.post("/api/user/account-deletion/request-otp"),
  verifyDeletionOtp:  (data) => api.post("/api/user/account-deletion/verify-otp", data),
  cancelDeletion:     ()     => api.post("/api/user/account-deletion/cancel"),
}

export const resumeAPI = {
  upload:  (formData) => api.post("/api/resume/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  getAll:  (params)   => api.get("/api/resume", { params }),
  getById: (id)       => api.get(`/api/resume/${id}`),
  update:  (id, data) => api.put(`/api/resume/${id}`, data),
  delete:  (id)       => api.delete(`/api/resume/${id}`),
  screen:  (id, payload) => api.post(`/api/resume/${id}/screen`, payload),
}

export default api
