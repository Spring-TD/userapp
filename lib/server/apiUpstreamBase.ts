/**
 * Base URL for Next.js `/api/apps/*` proxies (Create App MS, PWA, configuration, etc.).
 * Same as **`NEXT_PUBLIC_API_URL`** — see `getApiBaseUrl`.
 */
import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export function getApiUpstreamBase(): string {
  return getApiBaseUrl()
}
