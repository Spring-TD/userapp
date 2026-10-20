/**
 * Upstream origin for `/api/apps/*` proxies (create-app / account-ms when configured).
 */
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

/** @deprecated Use {@link getAppsUpstreamBase} */
export function getApiUpstreamBase(): string {
  return getAppsUpstreamBase()
}

/** Same origin as **`NEXT_PUBLIC_API_URL`** (e.g. account-ms for `/api/v1/apps/*` proxies). */
export function getAppsUpstreamBase(): string {
  return getApiBaseUrl()
}
