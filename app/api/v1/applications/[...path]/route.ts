import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const dynamic = "force-dynamic"

const BASE_URL = getApiBaseUrl().replace(/\/+$/, "")

function isMultipart(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  return contentType.includes("multipart/form-data")
}

async function parseUpstreamResponse(response: Response) {
  const text = await response.text()
  try {
    return { data: text ? JSON.parse(text) : {}, status: response.status || 200 }
  } catch {
    return {
      data: { success: false, error: text.slice(0, 500) || "Request failed" },
      status: response.status || 502,
    }
  }
}

async function proxyApplications(request: NextRequest, path: string[], method: "GET" | "POST" | "PATCH") {
  const authHeader = request.headers.get("authorization")
  const query = request.nextUrl.searchParams.toString()
  const target = `${BASE_URL}/api/v1/applications/${path.map(encodeURIComponent).join("/")}${query ? `?${query}` : ""}`

  const headers: Record<string, string> = {
    ...forwardStorefrontHeaders(request),
    ...(authHeader ? { Authorization: authHeader } : {}),
  }

  try {
    if (method === "GET") {
      const response = await fetch(target, { method: "GET", headers, cache: "no-store" })
      const { data, status } = await parseUpstreamResponse(response)
      return NextResponse.json(data, { status })
    }

    if (isMultipart(request)) {
      const formData = await request.formData()
      const response = await fetch(target, { method: "POST", headers, body: formData, cache: "no-store" })
      const { data, status } = await parseUpstreamResponse(response)
      return NextResponse.json(data, { status })
    }

    const body = await request.text()
    headers["Content-Type"] = request.headers.get("content-type") || "application/json"
    const response = await fetch(target, {
      method,
      headers,
      body: body || (method === "PATCH" ? undefined : "{}"),
      cache: "no-store",
    })
    const { data, status } = await parseUpstreamResponse(response)
    return NextResponse.json(data, { status })
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Application request failed" },
      { status: 502 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxyApplications(request, path, "GET")
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxyApplications(request, path, "POST")
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxyApplications(request, path, "PATCH")
}
