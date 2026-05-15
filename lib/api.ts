// lib/api.ts
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"

declare module "axios" {
  interface AxiosRequestConfig {
    includeAuth?: boolean
  }
  interface InternalAxiosRequestConfig {
    includeAuth?: boolean
  }
}
import { getAccessToken } from "@/lib/cookieAuth"
import {
  TENANT_APP_ID_STORAGE_KEY,
  TENANT_MERCHANT_ID_STORAGE_KEY,
  TENANT_SUBDOMAIN_STORAGE_KEY,
} from "@/lib/mobileTenant/storageKeys"
import { isMobileAuthDebugEnabled, mobileAuthLog, redactRegisterPayload } from "@/lib/mobileAuthDebug"

function isMobileAuthUrl(url?: string): boolean {
  if (!url) return false
  return (
    url.includes("/registration/") ||
    url.includes("/registration/user") ||
    url.includes("/client-ms/registration") ||
    url.includes("/otp/") ||
    url.includes("/auth/email-exists") ||
    url.includes("/auth/login") ||
    url.includes("/auth/register")
  )
}

function attachTenantHeaders(headers: Record<string, string>) {
  try {
    const tid = sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)
    if (tid) headers["x-tenant-app-id"] = tid
  } catch {
    /* ignore */
  }
  try {
    const mid = sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY)
    if (mid) headers["x-tenant-merchant-id"] = mid
  } catch {
    /* ignore */
  }
  try {
    const sub = sessionStorage.getItem(TENANT_SUBDOMAIN_STORAGE_KEY)
    if (sub) headers["x-tenant-subdomain"] = sub
  } catch {
    /* ignore */
  }
}

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

  if (config.data instanceof FormData && config.headers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (config.headers as any)["Content-Type"]
  }

  if (typeof window !== "undefined" && config.headers) {
    attachTenantHeaders(config.headers as Record<string, string>)
  }

  if (!includeAuth) {
    if (config.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (config.headers as any).Authorization
    }
    return config
  }

  const token = typeof window !== "undefined" ? getAccessToken() : null

  if (token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }

  if (isMobileAuthDebugEnabled() && isMobileAuthUrl(config.url)) {
    const h = (config.headers ?? {}) as Record<string, string>
    mobileAuthLog("HTTP request", {
      method: config.method,
      url: config.url,
      includeAuth,
      tenantHeaders: {
        "x-tenant-subdomain": h["x-tenant-subdomain"],
        "x-tenant-app-id": h["x-tenant-app-id"],
        "x-tenant-merchant-id": h["x-tenant-merchant-id"],
      },
      body:
        config.data && typeof config.data === "object" && !(config.data instanceof FormData)
          ? redactRegisterPayload(config.data as Record<string, unknown>)
          : config.data,
    })
  }

  return config
})

// Response interceptor: on 401, refresh via cookie (server reads refreshToken cookie)
api.interceptors.response.use(
  (response) => {
    if (isMobileAuthDebugEnabled() && isMobileAuthUrl(response.config?.url)) {
      mobileAuthLog("HTTP response", {
        method: response.config?.method,
        url: response.config?.url,
        status: response.status,
        data: response.data,
      })
    }
    return response
  },
  async (error) => {
    if (isMobileAuthDebugEnabled() && isMobileAuthUrl(error.config?.url)) {
      mobileAuthLog("HTTP error", {
        method: error.config?.method,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      })
    }
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
