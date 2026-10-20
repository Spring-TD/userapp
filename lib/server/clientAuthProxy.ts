import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { isAllowedClientAuthMsPath } from "@/lib/clientAuthMsAllowlist"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

const UPSTREAM_TIMEOUT_MS = 25_000
const UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function buildUpstreamUrl(segments: string[], search: string): string {
  const path = segments.map((s) => encodeURIComponent(s)).join("/")
  const base = getApiBaseUrl()
  return `${base}/api/v1/${path}${search || ""}`
}

export function forwardClientAuthHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = { ...forwardStorefrontHeaders(request) }
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  if (auth) out.Authorization = auth
  const ct = request.headers.get("content-type")
  if (ct) out["Content-Type"] = ct
  for (const h of ["x-tenant-app-id", "x-tenant-merchant-id", "accept", "accept-language"] as const) {
    const v = request.headers.get(h)
    if (v) out[h] = v
  }
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
 * Proxies to client-auth-ms via account-ms gateway using axios + IPv4 (avoids flaky `fetch` ETIMEDOUT).
 */
export async function proxyClientAuthRequest(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  if (!isAllowedClientAuthMsPath(segments)) {
    return NextResponse.json({ success: false, error: "Path not allowed on client-auth proxy" }, { status: 403 })
  }

  const url = buildUpstreamUrl(segments, request.nextUrl.search)
  const method = request.method.toUpperCase()
  const headers = forwardClientAuthHeaders(request)
  const pathKey = segments.join("/")
  const isRegistration = pathKey.startsWith("registration/")
  const isOtp = pathKey.startsWith("otp/")

  let body: Buffer | undefined
  let bodyLog: unknown
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) {
      body = Buffer.from(buf)
      try {
        const parsed = JSON.parse(body.toString("utf8")) as Record<string, unknown>
        bodyLog = { ...parsed, password: parsed.password ? "[REDACTED]" : undefined }
      } catch {
        bodyLog = `[${buf.byteLength} bytes]`
      }
    }
  }

  if (isRegistration || isOtp) {
    console.log("[mobile-auth][proxy] → upstream", {
      method,
      pathKey,
      url,
      tenantHeaders: {
        "x-tenant-subdomain": headers["x-tenant-subdomain"],
        "x-tenant-app-id": headers["x-tenant-app-id"],
        "x-tenant-merchant-id": headers["x-tenant-merchant-id"],
        "X-Forwarded-Host": headers["X-Forwarded-Host"],
      },
      body: bodyLog,
    })
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
    }

    try {
      const res = await axios.request(config)
      if (isRegistration || isOtp) {
        const data = res.data as Record<string, unknown> | null
        console.log("[mobile-auth][proxy] ← upstream", {
          pathKey,
          status: res.status,
          success: data?.success,
          error: data?.error,
          userId: (data?.user as Record<string, unknown> | undefined)?.id,
          verificationEmailSent: data?.verificationEmailSent,
          exists: data?.exists,
          valid: data?.valid,
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
  const msg =
    lastError instanceof Error ? lastError.message : "Upstream request failed"
  console.error("[client-auth proxy]", msg, url, lastError)
  return NextResponse.json(
    {
      success: false,
      error: timeout ? `Upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms` : msg,
    },
    { status: timeout ? 504 : 502 },
  )
}
