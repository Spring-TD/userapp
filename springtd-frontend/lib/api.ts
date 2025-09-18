// lib/api.ts
import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", // client-auth-ms
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // if cookies are involved
})

// Request interceptor (attach token)
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor (handle refresh)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem("refreshToken")
        if (!refreshToken) throw error

        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/v1/auth/refresh`,
          { refreshToken }
        )

        const newAccessToken = res.data?.accessToken
        localStorage.setItem("accessToken", newAccessToken)

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
