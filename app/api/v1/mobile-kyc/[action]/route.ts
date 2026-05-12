import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE_URL = process.env.KYC_PROVIDER_BASE_URL || ""
const PARTNER_ID = process.env.KYC_PROVIDER_PARTNER_ID || ""
const PARTNER_SECRET = process.env.KYC_PROVIDER_SECRET_KEY || ""

function requiredHeaders() {
  if (!BASE_URL || !PARTNER_ID || !PARTNER_SECRET) {
    throw new Error(
      "Missing KYC provider configuration. Set KYC_PROVIDER_BASE_URL, KYC_PROVIDER_PARTNER_ID and KYC_PROVIDER_SECRET_KEY.",
    )
  }
  return {
    Authorization: `Bearer ${PARTNER_SECRET}`,
    "x-partner-id": PARTNER_ID,
  }
}

function endpointForAction(action: string) {
  switch (action) {
    case "create-user":
      return "/api/v1/modular/user/"
    case "create-verification":
      return "/api/v1/modular/verification"
    case "status":
      return "/api/v1/modular/status"
    case "submit":
      return "/api/v1/modular/submit"
    case "complete":
      return "/api/v1/modular/complete"
    default:
      return null
  }
}

type RouteParams = { params: Promise<{ action: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { action } = await params
  const endpoint = endpointForAction(action)
  if (!endpoint) return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 404 })
  if (action !== "status") {
    return NextResponse.json({ success: false, error: "GET is only supported for status action" }, { status: 405 })
  }

  const verificationId = request.nextUrl.searchParams.get("verification_id")
  if (!verificationId) {
    return NextResponse.json({ success: false, error: "verification_id query parameter is required" }, { status: 400 })
  }

  try {
    const resp = await fetch(`${BASE_URL}${endpoint}/${encodeURIComponent(verificationId)}`, {
      method: "GET",
      headers: requiredHeaders(),
    })
    const text = await resp.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: resp.status })
    } catch {
      return NextResponse.json({ success: resp.ok, data: text }, { status: resp.status })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "KYC provider request failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { action } = await params
  const endpoint = endpointForAction(action)
  if (!endpoint) return NextResponse.json({ success: false, error: "Unsupported action" }, { status: 404 })

  try {
    const verificationId = request.nextUrl.searchParams.get("verification_id")
    const endpointWithId =
      (action === "submit" || action === "complete") && verificationId
        ? `${endpoint}/${encodeURIComponent(verificationId)}`
        : endpoint

    if ((action === "submit" || action === "complete") && !verificationId) {
      return NextResponse.json({ success: false, error: "verification_id query parameter is required" }, { status: 400 })
    }

    const body = await request.text()
    const resp = await fetch(`${BASE_URL}${endpointWithId}`, {
      method: "POST",
      headers: {
        ...requiredHeaders(),
        "Content-Type": "application/json",
      },
      body: action === "complete" ? undefined : body,
    })
    const text = await resp.text()
    try {
      return NextResponse.json(JSON.parse(text), { status: resp.status })
    } catch {
      return NextResponse.json({ success: resp.ok, data: text }, { status: resp.status })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "KYC provider request failed"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
