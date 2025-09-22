// services/authService.ts
import api from "@/lib/api"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  password: string
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post("/api/v1/auth/login", payload)
    if (data?.accessToken && data?.refreshToken) {
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
    }
    return data
  },

  async logout() {
    await api.post("/api/v1/auth/logout")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  },

  async getCurrentUser() {
    const { data } = await api.get("/api/v1/auth/me")
    return data
  },
}
