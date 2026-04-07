/**
 * Base URL for Next.js `/api/apps/*` proxies (Create App microservice: `/api/v1/apps`, PWA templates,
 * configuration, `/api/v1/pwa/*`, etc.).
 *
 * Uses **`NEXT_PUBLIC_API_URL`** from `.env` — one API base for the SpringTD backend; deployment host
 * (e.g. Fly) is not a separate “base URL” in code.
 */
export function getApiUpstreamBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "https://account-ms.fly.dev"
  return raw.replace(/\/$/, "")
}
