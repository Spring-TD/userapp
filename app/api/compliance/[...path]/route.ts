import { NextRequest, NextResponse } from "next/server"

import { proxyAccountMsGateway } from "@/lib/server/accountMsGatewayProxy"
import { forwardStorefrontHeaders } from "@/lib/server/forwardStorefrontHeaders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function readAccessTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";").map((p) => p.trim())
  const kv = parts.find((p) => p.startsWith("accessToken="))
  if (!kv) return null
  const raw = kv.slice("accessToken=".length)
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function extractRoleFromBearer(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return "MERCHANT"
  try {
    const token = authHeader.replace("Bearer ", "")
    const [, payload] = token.split(".")
    if (!payload) return "MERCHANT"
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString())
    const candidates = [
      decoded?.role,
      decoded?.userRole,
      decoded?.user_role,
      decoded?.userType,
      decoded?.user_type,
      Array.isArray(decoded?.roles) ? decoded.roles[0] : undefined,
    ]
      .filter((v: unknown) => typeof v === "string" && String(v).trim())
      .map((v: unknown) => String(v).toUpperCase().replace(/^ROLE_/, ""))
    return candidates[0] || "MERCHANT"
  } catch {
    return "MERCHANT"
  }
}

function buildGatewayHeaders(request: NextRequest): Record<string, string> {
  const method = request.method.toUpperCase()
  const contentType = request.headers.get("Content-Type") ?? ""
  const isMultipart = contentType.includes("multipart/form-data")

  const headers: Record<string, string> = {
    ...forwardStorefrontHeaders(request),
    Accept: "application/json",
  }

  if (!isMultipart && method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json"
  }

  const incomingAuth = request.headers.get("Authorization") || request.headers.get("authorization")
  const cookieHeader = request.headers.get("cookie")
  const tokenFromCookie = readAccessTokenFromCookieHeader(cookieHeader)
  const authHeader = incomingAuth || (tokenFromCookie ? `Bearer ${tokenFromCookie}` : null)

  if (authHeader) {
    headers.Authorization = authHeader
    const role = extractRoleFromBearer(authHeader)
    headers["x-user-role"] = role
    headers["x-user-type"] = role
    headers["x-user-roles"] = role
  }

  if (cookieHeader) {
    headers.Cookie = cookieHeader
  }

  return headers
}

/**
 * Proxies KYC/compliance routes to account-ms gateway (`/api/v1/kyc/*`) via axios + IPv4,
 * matching registration/auth/wallet BFF proxies (avoids flaky Node fetch ETIMEDOUT).
 */
export class Compliance {
  static async proxy(request: NextRequest, pathSegments: string[]) {
    const pathKey = pathSegments.join("/")
    const method = request.method.toUpperCase()
    const contentType = request.headers.get("Content-Type") ?? ""
    const isMultipart = contentType.includes("multipart/form-data")
    const headers = buildGatewayHeaders(request)

    let body: Buffer | undefined
    if (method !== "GET" && method !== "HEAD") {
      if (isMultipart) {
        if (contentType) headers["Content-Type"] = contentType
        const rawBody = await request.arrayBuffer()
        if (rawBody.byteLength === 0) {
          return NextResponse.json(
            { success: false, error: 'No file uploaded. Send a single file in the "file" field.' },
            { status: 400 },
          )
        }
        body = Buffer.from(rawBody)
      } else {
        const text = await request.text()
        if (text) body = Buffer.from(text)
      }
    }

    const response = await proxyAccountMsGateway(request, {
      pathSegments: ["kyc", ...pathSegments],
      headers,
      body,
      logTag: "Compliance",
    })

    if (pathSegments[0] === "status" && pathSegments[1] && response.status < 500) {
      try {
        const payload = await response.clone().json()
        console.info("[Compliance] GET /api/v1/kyc/status/:userId response", {
          userId: pathSegments[1],
          statusCode: response.status,
          payload,
        })
      } catch {
        /* ignore log parse errors */
      }
    }

    return response
  }
}

type RouteParams = { params: Promise<{ path: string[] }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path)
  return Compliance.proxy(request, path)
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path)
  return Compliance.proxy(request, path)
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path)
  return Compliance.proxy(request, path)
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path)
  return Compliance.proxy(request, path)
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const path = await params.then((p) => p.path)
  return Compliance.proxy(request, path)
}
