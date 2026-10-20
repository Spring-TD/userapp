import api from "@/lib/api"
import type { ApiRequestConfig } from "@/lib/api"

type HttpMethod = "get" | "post" | "put" | "delete" | "patch"

/**
 * Thin wrapper around our axios api client for billing-service.
 * Keeps the `request(method, url, data, params)` interface used by billing-service.
 */
const billingClient = {
  async request<T>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const config: ApiRequestConfig = { params }

    switch (method) {
      case "get":
        return (await api.get<T>(url, config)).data
      case "delete":
        return (await api.delete<T>(url, config)).data
      case "post":
        return (await api.post<T>(url, data, config)).data
      case "put":
        return (await api.put<T>(url, data, config)).data
      case "patch":
        return (await api.patch<T>(url, data, config)).data
      default:
        throw new Error(`Unsupported HTTP method: ${method}`)
    }
  },
}

export default billingClient

