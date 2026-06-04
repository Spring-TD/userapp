import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

const UPSTREAM_TIMEOUT_MS = 60_000
const UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function buildUpstreamUrl(path: string[], search: string): string {
  const segments = path.map((s) => encodeURIComponent(s)).join("/")
  const base = getApiBaseUrl().replace(/\/+$/, "")
  return `${base}/api/v1/applications/${segments}${search || ""}`
}

function forwardApplicationHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = { ...forwardStorefrontHeaders(request) }

  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  if (auth) out.Authorization = auth.startsWith("Bearer ") ? auth : `Bearer ${auth}`

  const contentType = request.headers.get("content-type")
  if (contentType) out["Content-Type"] = contentType

  return out
}

function isRetryableNetworkError(e: unknown): boolean {
  if (!isAxiosError(e)) return false
  const code = e.code
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH"
  )
}

/**
 * Proxies `/api/v1/applications/*` to account-ms using axios + IPv4 (avoids flaky Node `fetch` ETIMEDOUT).
 */
export async function proxyAccountMsApplicationsRequest(
  request: NextRequest,
  path: string[],
): Promise<NextResponse> {
  const url = buildUpstreamUrl(path, request.nextUrl.search)
  const method = request.method.toUpperCase()
  const headers = forwardApplicationHeaders(request)
  const isMultipart = (headers["Content-Type"] || "").includes("multipart/form-data")

  if (process.env.NODE_ENV === "development") {
    console.log("[applications proxy] → upstream", { method, url })
  }

  let body: Buffer | undefined
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) body = Buffer.from(buf)
    else if (!isMultipart && method !== "GET") body = Buffer.from("{}")
  }

  let lastError: unknown

  for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt++) {
    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      data: body,
      httpsAgent,
      timeout: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }

    try {
      const res = await axios.request(config)
      if (process.env.NODE_ENV === "development" && res.status >= 400) {
        const row = res.data as Record<string, unknown> | null
        console.log("[applications proxy] ← upstream", {
          status: res.status,
          error: row?.error ?? row?.message,
        })
      }
      return NextResponse.json(res.data, { status: res.status })
    } catch (e) {
      lastError = e
      if (!isRetryableNetworkError(e) || attempt >= UPSTREAM_RETRIES) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }

  const timeout = isRetryableNetworkError(lastError)
  const msg = lastError instanceof Error ? lastError.message : "Application request failed"
  console.error("[applications proxy]", msg, url, lastError)
  return NextResponse.json(
    {
      success: false,
      error: timeout
        ? `Could not reach the application service (timed out after ${UPSTREAM_TIMEOUT_MS}ms). Check your connection and try again.`
        : msg === "fetch failed"
          ? "Could not reach the application service. Check your connection and try again."
          : msg,
    },
    { status: timeout ? 504 : 502 },
  )
}
