import { getApiBaseUrl } from "@/lib/apiBaseUrl"

/**
 * Base URL for account / product APIs. Uses **`NEXT_PUBLIC_API_URL`** only (`getApiBaseUrl`).
 */
export function getAccountMsPlataBaseUrl(): string {
  return getApiBaseUrl()
}
