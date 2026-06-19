import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

const UPSTREAM_TIMEOUT_MS = 45_000
const UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function buildUpstreamUrl(path: string[], search: string): string {
  const segments = path.map((segment) => encodeURIComponent(segment)).join("/")
  const base = getApiBaseUrl().replace(/\/+$/, "")
  const suffix = segments ? `/${segments}` : ""
  return `${base}/api/v1/notifications/inbox${suffix}${search || ""}`
}

function forwardHeaders(request: NextRequest): Record<string, string> {
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

function isUpstreamUnavailable(status: number, data: unknown): boolean {
  if (status >= 502) return true
  if (typeof data === "string" && data.toLowerCase().includes("trying to proxy")) return true
  if (data && typeof data === "object") {
    const error = String((data as { error?: unknown }).error ?? "")
    if (error.toLowerCase().includes("trying to proxy")) return true
  }
  return false
}

function inboxPathSegments(request: NextRequest, path: string[]): string[] {
  if (path.length > 0) return path
  const prefix = "/api/v1/notifications/inbox"
  const rest = request.nextUrl.pathname.startsWith(prefix)
    ? request.nextUrl.pathname.slice(prefix.length).replace(/^\//, "")
    : ""
  return rest ? rest.split("/").filter(Boolean) : []
}

function emptyInboxPayload(path: string[], search: string) {
  const params = new URLSearchParams(search.replace(/^\?/, ""))
  const limit = Number(params.get("limit") || 50)
  const offset = Number(params.get("offset") || 0)
  const last = path[path.length - 1] ?? ""

  if (path[0] === "unread-count") {
    return { success: true, data: { unreadCount: 0 } }
  }

  if (last === "read") {
    return { success: true, data: { modifiedCount: 0, readAt: new Date().toISOString() } }
  }

  if (path.length === 1 && path[0]) {
    return { success: true, data: { id: path[0], deleted: true } }
  }

  return {
    success: true,
    data: {
      notifications: [],
      total: 0,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    },
  }
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!isAxiosError(error)) return false
  const code = error.code
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH"
  )
}

export async function proxyNotificationsInboxRequest(
  request: NextRequest,
  path: string[] = [],
): Promise<NextResponse> {
  const segments = inboxPathSegments(request, path)
  const url = buildUpstreamUrl(segments, request.nextUrl.search)
  const method = request.method.toUpperCase()
  const headers = forwardHeaders(request)

  const config: AxiosRequestConfig = {
    url,
    method,
    headers,
    timeout: UPSTREAM_TIMEOUT_MS,
    httpsAgent,
    validateStatus: () => true,
  }

  if (method !== "GET" && method !== "HEAD") {
    config.data = await request.text()
  }

  let lastError: unknown
  for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt += 1) {
    try {
      const response = await axios.request(config)
      const data = response.data ?? {}

      if (isUpstreamUnavailable(response.status || 502, data)) {
        return NextResponse.json(emptyInboxPayload(segments, request.nextUrl.search), { status: 200 })
      }

      return NextResponse.json(data, { status: response.status || 502 })
    } catch (error) {
      lastError = error
      if (!isRetryableNetworkError(error) || attempt === UPSTREAM_RETRIES) break
    }
  }

  if (isAxiosError(lastError) && (lastError.code === "ECONNABORTED" || lastError.name === "CanceledError")) {
    return NextResponse.json(emptyInboxPayload(segments, request.nextUrl.search), { status: 200 })
  }

  return NextResponse.json(emptyInboxPayload(segments, request.nextUrl.search), { status: 200 })
}
