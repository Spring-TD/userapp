/**
 * Upstream origin for `/api/apps/*` proxies (same as **`NEXT_PUBLIC_API_URL`**).
 * Paths in route handlers append **`/api/v1/...`** (or whatever the backend expects) to this base.
 */
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export function getApiUpstreamBase(): string {
  return getApiBaseUrl()
}
