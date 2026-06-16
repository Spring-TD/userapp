import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function manualKycUrl() {
  return `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/kyc/manual/individual`
}

function authHeaders(request: NextRequest): Record<string, string> {
  const cookieToken = request.cookies.get("accessToken")?.value
  const incomingAuth = request.headers.get("authorization") || request.headers.get("Authorization")
  const auth = incomingAuth || (cookieToken ? `Bearer ${cookieToken}` : "")
  return {
    ...forwardStorefrontHeaders(request),
    Accept: "application/json",
    ...(auth ? { Authorization: auth } : {}),
  }
}

async function proxy(request: NextRequest) {
  const method = request.method.toUpperCase()
  const headers = authHeaders(request)
  let body: string | undefined

  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json"
    body = await request.text()
  }

  try {
    const res = await fetch(manualKycUrl(), {
      method,
      headers,
      body: body || undefined,
      cache: "no-store",
    })
    const text = await res.text()
    const contentType = res.headers.get("content-type") || "application/json"
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manual KYC request failed"
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }
}

export async function GET(request: NextRequest) {
  return proxy(request)
}

export async function POST(request: NextRequest) {
  return proxy(request)
}
