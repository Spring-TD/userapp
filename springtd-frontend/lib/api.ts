// lib/api.ts
import axios from "axios"

// Only log in development
const isDev = process.env.NODE_ENV !== 'production'

// Use relative URL so requests go through our own Next.js API proxy
// This avoids CORS issues when deployed to Vercel
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor (attach token)
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  const isPublicEndpoint = config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/register') ||
    config.url?.includes('/auth/verify-account')
  if (token && !isPublicEndpoint) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (isPublicEndpoint) {
    delete config.headers.Authorization
  }
  return config
})

// Response interceptor (handle refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Log errors only in development (no sensitive data)
    if (isDev) {
      console.log("API Error:", originalRequest?.url, error.response?.status)
    }

    // Skip refresh logic for auth endpoints to avoid loops
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/me')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem("refreshToken")
        if (!refreshToken) {
          throw error
        }

        const res = await axios.post("/api/auth/refresh", { refreshToken })

        // Handle different response structures from refresh endpoint
        let newAccessToken = res.data?.data?.accessToken ||
          res.data?.accessToken ||
          res.data?.data?.tokens?.accessToken

        if (!newAccessToken) {
          throw new Error("No access token in refresh response")
        }

        localStorage.setItem("accessToken", newAccessToken)
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError: any) {
        // Clear tokens and default headers
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        delete api.defaults.headers.common.Authorization

        // Only redirect if we're not already on signin page
        if (typeof window !== "undefined" && !window.location.pathname.includes("/signin")) {
          window.location.href = "/signin"
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
