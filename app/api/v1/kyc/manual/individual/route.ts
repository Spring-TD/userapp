import { NextRequest, NextResponse } from "next/server"

import { proxyAccountMsGateway } from "@/lib/server/accountMsGatewayProxy"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
  let body: Buffer | undefined

  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json"
    const text = await request.text()
    if (text) body = Buffer.from(text)
  }

  return proxyAccountMsGateway(request, {
    pathSegments: ["kyc", "manual", "individual"],
    headers,
    body,
    logTag: "manual-kyc",
  })
}

export async function GET(request: NextRequest) {
  return proxy(request)
}

export async function POST(request: NextRequest) {
  return proxy(request)
}
