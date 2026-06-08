import https from "node:https"

import axios, { type AxiosRequestConfig, isAxiosError } from "axios"
import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"

export const dynamic = "force-dynamic"

const UPSTREAM_TIMEOUT_MS = 25_000
const httpsAgent = new https.Agent({ family: 4, keepAlive: true })

function upstreamUrl(request: NextRequest) {
  const base = getApiBaseUrl().replace(/\/+$/, "")
  return `${base}/api/v1/applications/init${request.nextUrl.search || ""}`
}

function authHeaders(request: NextRequest): Record<string, string> {
  const cookieAccessToken = request.cookies.get("accessToken")?.value
  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    (cookieAccessToken ? `Bearer ${cookieAccessToken}` : null)

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(auth ? { Authorization: auth.startsWith("Bearer ") ? auth : `Bearer ${auth}` } : {}),
  }
}

async function proxyApplicationInit(request: NextRequest) {
  const method = request.method.toUpperCase()
  const url = upstreamUrl(request)
  const headers = authHeaders(request)
  let body: Buffer | undefined

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) body = Buffer.from(buf)
  }

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
  } catch (error: unknown) {
    const code = isAxiosError(error) ? error.code : undefined
    const timeout = code === "ETIMEDOUT" || code === "ECONNABORTED"
    return NextResponse.json(
      {
        success: false,
        error: timeout ? `Upstream timed out after ${UPSTREAM_TIMEOUT_MS}ms` : error instanceof Error ? error.message : "Upstream request failed",
      },
      { status: timeout ? 504 : 502 },
    )
  }
}

/** POST /api/v1/applications/init — initialize application and create product account. */
export async function POST(request: NextRequest) {
  return proxyApplicationInit(request)
}
