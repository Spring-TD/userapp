// lib/api.ts
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import { getAccessToken } from "@/lib/cookieAuth"

// Use relative URL so requests go through our own Next.js API proxy
export interface ApiRequestConfig extends AxiosRequestConfig {
  includeAuth?: boolean
}

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then((res) => (res.data?.data?.accessToken ?? res.data?.accessToken ?? null) as string | null)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Request interceptor: use cookie (or localStorage fallback) for token
api.interceptors.request.use((config: InternalAxiosRequestConfig & { includeAuth?: boolean }) => {
  const includeAuth = (config as any).includeAuth ?? true

  if (!includeAuth) {
    if (config.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (config.headers as any).Authorization
    }
    return config
  }

  if (config.data instanceof FormData && config.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (config.headers as any)["Content-Type"]
  }

  const token = typeof window !== "undefined" ? getAccessToken() : null

  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }

  if (typeof window !== "undefined" && config.headers) {
    const h = config.headers as Record<string, string>
    try {
      const tid = sessionStorage.getItem("mobile-v2-tenant-app-id")
      if (tid) h["x-tenant-app-id"] = tid
    } catch {
      /* ignore */
    }
    try {
      const mid = sessionStorage.getItem("mobile-v2-tenant-merchant-id")
      if (mid) h["x-tenant-merchant-id"] = mid
    } catch {
      /* ignore */
    }
  }

  return config
})

// Response interceptor: on 401, refresh via cookie (server reads refreshToken cookie)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/me') ||
      originalRequest?.url?.includes('/v1/auth/')

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true
      const newAccessToken = await refreshAccessToken()
      if (newAccessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`
        const retryHeaders = (originalRequest.headers ?? {}) as Record<string, string>
        retryHeaders.Authorization = `Bearer ${newAccessToken}`
        originalRequest.headers = retryHeaders as any
        return api(originalRequest)
      }
      delete api.defaults.headers.common.Authorization
    }
    return Promise.reject(error)
  },
)

type ApiClient = {
  get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  post<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  put<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
  patch<T = unknown, B = unknown>(url: string, data?: B, config?: ApiRequestConfig): Promise<AxiosResponse<T>>
}

export const apiClient: ApiClient = {
  get: (url, config) => api.get(url, { ...config }),
  delete: (url, config) => api.delete(url, { ...config }),
  post: (url, data, config) => api.post(url, data, { ...config }),
  put: (url, data, config) => api.put(url, data, { ...config }),
  patch: (url, data, config) => api.patch(url, data, { ...config }),
}

export default api
