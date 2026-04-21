import { NextRequest, NextResponse } from "next/server"

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

function getComplianceOrigin(): string {
  const raw =
    process.env.COMPLIANCE_API_URL ||
    process.env.NEXT_PUBLIC_COMPLIANCE_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://account-ms.fly.dev"
  const url = raw.replace(/\/+$/, "").trim()
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`
    const u = new URL(withProtocol)
    return u.origin
  } catch {
    const withoutPath = url.replace(/\/(api(\/v1)?)?\/?.*$/i, "").replace(/\/+$/, "")
    return withoutPath || url
  }
}

/** Build full URL: {origin}/api/v1/kyc/{...pathSegments} — v1 is never omitted. */
function buildComplianceUrl(pathSegments: string[]): string {
  const origin = getComplianceOrigin().replace(/\/+$/, "")
  const pathParts = ["api", "v1", "kyc", ...pathSegments]
  const path = "/" + pathParts.join("/")
  return `${origin}${path}`
}

function parseUpstreamBody(status: number, text: string): unknown {
  if (!text) {
    return { success: status >= 200 && status < 300 }
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { success: status >= 200 && status < 300, data: text }
  }
}

/**
 * Compliance class: proxies all KYC/compliance requests to the compliance microservice.
 * Uses native fetch (no axios) so Next dev bundling does not reference missing vendor chunks.
 */
export class Compliance {
  static async proxy(request: NextRequest, pathSegments: string[]) {
    const pathKey = pathSegments.join("/")
    const url = buildComplianceUrl(pathSegments)
    const method = request.method
    const contentType = request.headers.get("Content-Type") ?? ""
    const isMultipart = contentType.includes("multipart/form-data")

    const headers: Record<string, string> = {}
    if (!isMultipart && method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = "application/json"
    }
    const incomingAuth = request.headers.get("Authorization") || request.headers.get("authorization")
    const cookieHeader = request.headers.get("cookie")
    const tokenFromCookie = readAccessTokenFromCookieHeader(cookieHeader)
    const authHeader = incomingAuth || (tokenFromCookie ? `Bearer ${tokenFromCookie}` : null)
    if (authHeader) {
      headers["Authorization"] = authHeader
      const role = extractRoleFromBearer(authHeader)
      headers["x-user-role"] = role
      headers["x-user-type"] = role
      headers["x-user-roles"] = role
    }
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader
    }

    const timeoutMs = isMultipart ? 120_000 : 30_000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      let body: BodyInit | undefined
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
          body = rawBody
        } else {
          const text = await request.text()
          if (text) body = text
        }
      }

      const resp = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      })

      const text = await resp.text()
      const parsed = parseUpstreamBody(resp.status, text)
      const data =
        typeof parsed === "object" && parsed !== null
          ? parsed
          : { success: resp.ok, data: parsed }

      // Debug merchant redirect behavior: log exactly what status endpoint returns.
      if (pathSegments[0] === "status" && pathSegments[1]) {
        console.info("[Compliance] GET /api/v1/kyc/status/:userId response", {
          userId: pathSegments[1],
          statusCode: resp.status,
          payload: data,
        })
      }

      return NextResponse.json(data, { status: resp.status })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("[Compliance] proxy timeout:", { path: pathKey, url, timeoutMs })
        return NextResponse.json(
          { success: false, error: "Compliance request timed out" },
          { status: 504 },
        )
      }
      const msg = err instanceof Error ? err.message : "Compliance request failed"
      const errCause = err instanceof Error && (err as Error & { cause?: unknown }).cause
      console.error("[Compliance] proxy FAILED:", {
        path: pathKey,
        url,
        message: msg,
        cause: errCause,
      })
      return NextResponse.json({ success: false, error: msg }, { status: 500 })
    } finally {
      clearTimeout(timer)
    }
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
