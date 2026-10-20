import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export const GATEWAY_UPSTREAM_TIMEOUT_MS = 25_000
export const GATEWAY_UPSTREAM_RETRIES = 2

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

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

export type GatewayProxyOptions = {
  /** Path segments after `/api/v1/` (e.g. `kyc/modular/verification`). */
  pathSegments: string[]
  headers: Record<string, string>
  body?: Buffer
  logTag?: string
}

/**
 * Proxies to account-ms gateway using axios + IPv4 (same approach as client-auth proxy).
 * Avoids flaky Node `fetch` ETIMEDOUT to fly.dev.
 */
export async function proxyAccountMsGateway(
  request: NextRequest,
  options: GatewayProxyOptions,
): Promise<NextResponse> {
  const { pathSegments, headers, body, logTag = "gateway" } = options
  const pathKey = pathSegments.join("/")
  const url = `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/${pathKey}${request.nextUrl.search}`
  const method = request.method.toUpperCase()

  let lastError: unknown

  for (let attempt = 0; attempt <= GATEWAY_UPSTREAM_RETRIES; attempt++) {
    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      data: body,
      httpsAgent,
      timeout: GATEWAY_UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
      maxRedirects: 0,
      responseType: "json",
      transformResponse: [(data) => data],
    }

    try {
      const res = await axios.request<string>(config)
      let payload: unknown = res.data
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload) as unknown
        } catch {
          payload = { success: res.status >= 200 && res.status < 300, data: payload }
        }
      }
      if (payload == null || typeof payload !== "object") {
        payload = { success: res.status >= 200 && res.status < 300, data: payload }
      }
      return NextResponse.json(payload, { status: res.status })
    } catch (e) {
      lastError = e
      if (!isRetryableNetworkError(e) || attempt >= GATEWAY_UPSTREAM_RETRIES) break
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }

  const timeout = isRetryableNetworkError(lastError)
  const msg = lastError instanceof Error ? lastError.message : "Upstream request failed"
  console.error(`[${logTag}] proxy FAILED:`, { path: pathKey, url, message: msg, lastError })
  return NextResponse.json(
    {
      success: false,
      error: timeout ? `Upstream timed out after ${GATEWAY_UPSTREAM_TIMEOUT_MS}ms` : msg,
    },
    { status: timeout ? 504 : 502 },
  )
}
