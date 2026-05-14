import { NextRequest, NextResponse } from "next/server"
import https from "node:https"
import axios, { type AxiosRequestConfig } from "axios"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { isAllowedClientAuthMsPath } from "@/lib/clientAuthMsAllowlist"

export const dynamic = "force-dynamic"

const httpsAgent = new https.Agent({
  family: 4,
  keepAlive: true,
})

type RouteParams = { params: Promise<{ path: string[] }> }

function buildUpstreamUrl(segments: string[], search: string): string {
  const path = segments.map((s) => encodeURIComponent(s)).join("/")
  const base = getApiBaseUrl()
  return `${base}/api/v1/${path}${search || ""}`
}

function forwardHeaders(request: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  const auth = request.headers.get("authorization")
  if (auth) out.Authorization = auth
  const ct = request.headers.get("content-type")
  if (ct) out["Content-Type"] = ct
  for (const h of ["x-tenant-app-id", "x-tenant-merchant-id", "accept", "accept-language"] as const) {
    const v = request.headers.get(h)
    if (v) out[h] = v
  }
  return out
}

async function proxy(request: NextRequest, segments: string[]): Promise<NextResponse> {
  if (!isAllowedClientAuthMsPath(segments)) {
    return NextResponse.json({ success: false, error: "Path not allowed on client-ms proxy" }, { status: 403 })
  }

  const url = buildUpstreamUrl(segments, request.nextUrl.search)
  const method = request.method.toUpperCase()
  const headers = forwardHeaders(request)

  const config: AxiosRequestConfig = {
    url,
    method,
    headers,
    httpsAgent,
    validateStatus: () => true,
    maxRedirects: 0,
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > 0) {
      config.data = Buffer.from(buf)
    }
  }

  try {
    const res = await axios.request(config)
    return NextResponse.json(res.data, { status: res.status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upstream request failed"
    console.error("[client-ms proxy]", msg, url)
    return NextResponse.json({ success: false, error: msg }, { status: 502 })
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function HEAD(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { path } = await params
  return proxy(request, path || [])
}
