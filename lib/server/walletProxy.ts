import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getWalletProxyBaseUrl } from "@/lib/apiBaseUrl"

const UPSTREAM_TIMEOUT_MS = 25_000
const UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

function buildUpstreamUrl(segments: string[], search: string): string {
  const path = segments.map((s) => encodeURIComponent(s)).join("/")
  const base = getWalletProxyBaseUrl()
  return `${base}/api/v1/wallets/${path}${search || ""}`
}

function forwardWalletAuthHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)
  if (auth) out.Authorization = auth.startsWith("Bearer ") ? auth : `Bearer ${auth}`
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

/** Server-side proxy: {@link getWalletProxyBaseUrl} + `/api/v1/wallets/*` (wallet-ms, not account-ms gateway). */
export async function proxyWalletRequest(
  request: NextRequest,
  segments: string[],
): Promise<NextResponse> {
  const url = buildUpstreamUrl(segments, request.nextUrl.search)
  const method = request.method.toUpperCase()
  const headers = forwardWalletAuthHeaders(request)

  if (process.env.NODE_ENV === "development") {
    console.log("[wallet proxy] → upstream", { method, url })
  }

  let body: Buffer | undefined
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) body = Buffer.from(buf)
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
      return NextResponse.json(res.data, { status: res.status })
    } catch (e) {
      lastError = e
      if (!isRetryableNetworkError(e) || attempt >= UPSTREAM_RETRIES) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }

  const timeout = isRetryableNetworkError(lastError)
  const msg = lastError instanceof Error ? lastError.message : "Upstream request failed"
  console.error("[wallet proxy]", msg, url, lastError)
  return NextResponse.json(
    {
      success: false,
      error: timeout ? `Upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms` : msg,
    },
    { status: timeout ? 504 : 502 },
  )
}
