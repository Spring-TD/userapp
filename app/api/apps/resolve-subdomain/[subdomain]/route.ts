import { NextRequest, NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { isReservedSubdomain } from "@/lib/mobileTenant/subdomain"
import { fetchUpstream, isUpstreamTimeoutError, upstreamErrorMessage } from "@/lib/server/upstreamFetch"

export const dynamic = "force-dynamic"

function asNonEmptyString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim()
  if (v != null && typeof v !== "object" && String(v).trim()) return String(v).trim()
  return null
}

/** Map create-app-ms `GET /api/v1/apps/resolve/:subdomain` (and legacy shapes) to `merchantId`. */
function pickMerchantId(d: Record<string, unknown>): string | null {
  const merchantObj =
    d.merchant && typeof d.merchant === "object" ? (d.merchant as Record<string, unknown>) : null
  const candidates: unknown[] = [
    d.merchantId,
    d.user_merchant_id,
    d.userMerchantId,
    d.merchant_id,
    merchantObj?.id,
    merchantObj?._id,
  ]
  for (const c of candidates) {
    const s = asNonEmptyString(c)
    if (s) return s
  }
  return null
}

function normalizePwaInstall(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null
  return raw as Record<string, unknown>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> },
) {
  try {
    const { subdomain: raw } = await params
    const subdomain = decodeURIComponent(raw || "").trim().toLowerCase()
    if (!subdomain || !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      return NextResponse.json({ success: false, error: "Invalid subdomain" }, { status: 400 })
    }
    if (isReservedSubdomain(subdomain)) {
      return NextResponse.json({ success: false, error: "Reserved subdomain" }, { status: 400 })
    }

    const base = getApiBaseUrl()
    const url = `${base}/api/v1/apps/resolve/${encodeURIComponent(subdomain)}`

    const forwardedHost =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host")?.trim() ||
      ""

    const response = await fetchUpstream(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(forwardedHost ? { "X-Forwarded-Host": forwardedHost } : {}),
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            (typeof data === "object" && data && "error" in data && (data as { error?: string }).error) ||
            (typeof data === "object" && data && "message" in data && (data as { message?: string }).message) ||
            "App not found",
        },
        { status: response.status === 404 ? 404 : response.status || 502 },
      )
    }

    const payload = (data as { data?: unknown }).data
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid upstream response (missing data)" },
        { status: 502 },
      )
    }

    const d = payload as Record<string, unknown>
    const appId = asNonEmptyString(d.id) || asNonEmptyString(d.appId)
    if (!appId) {
      return NextResponse.json(
        { success: false, error: "Upstream response missing app id" },
        { status: 502 },
      )
    }

    const merchantId = pickMerchantId(d)
    const resolvedSub = asNonEmptyString(d.subdomain) || subdomain
    const pwaRaw = "pwaInstall" in d ? d.pwaInstall : undefined
    const pwaInstall = normalizePwaInstall(pwaRaw)
    const pwaManifestRaw = "pwaManifest" in d ? d.pwaManifest : undefined
    const pwaManifest =
      pwaManifestRaw && typeof pwaManifestRaw === "object" ? (pwaManifestRaw as Record<string, unknown>) : null

    return NextResponse.json({
      success: true,
      data: {
        appId,
        subdomain: resolvedSub,
        ...(merchantId ? { merchantId } : {}),
        ...(pwaInstall ? { pwaInstall } : {}),
        ...(pwaManifest ? { pwaManifest } : {}),
      },
    })
  } catch (e) {
    console.error("[resolve-subdomain]", e)
    const timeout = isUpstreamTimeoutError(e)
    return NextResponse.json(
      {
        success: false,
        error: upstreamErrorMessage(e, "Failed to resolve subdomain"),
      },
      { status: timeout ? 504 : 502 },
    )
  }
}
