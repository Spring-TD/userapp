import { NextRequest, NextResponse } from "next/server"

import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"
import { isReservedSubdomain } from "@/lib/mobileTenant/subdomain"

export const dynamic = "force-dynamic"

const API_UPSTREAM_BASE = getApiUpstreamBase()

function asNonEmptyString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim()
  if (v != null && typeof v !== "object" && String(v).trim()) return String(v).trim()
  return null
}

/** Map create-app / account-ms app payload fields to retail `user_merchant_id` (sent as `x-tenant-merchant-id`). */
function pickMerchantId(
  app: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  root: Record<string, unknown>,
): string | null {
  const merchantObj =
    app?.merchant && typeof app.merchant === "object" ? (app.merchant as Record<string, unknown>) : null
  const candidates: unknown[] = [
    app?.user_merchant_id,
    app?.userMerchantId,
    app?.merchant_id,
    app?.merchantId,
    merchantObj?.id,
    merchantObj?._id,
    payload?.merchantId,
    payload?.user_merchant_id,
    root.merchantId,
  ]
  for (const c of candidates) {
    const s = asNonEmptyString(c)
    if (s) return s
  }
  return null
}

export async function GET(
  _request: NextRequest,
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

    const pathSuffix =
      (process.env.APPS_RESOLVE_SUBDOMAIN_PATH || "/api/v1/apps/public/by-subdomain").replace(/\/$/, "") +
      `/${encodeURIComponent(subdomain)}`

    const url = `${API_UPSTREAM_BASE}${pathSuffix.startsWith("/") ? "" : "/"}${pathSuffix}`

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 },
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

    const payload = (data as { data?: unknown }).data ?? data
    const app =
      payload && typeof payload === "object" && "app" in (payload as object)
        ? (payload as { app: Record<string, unknown> }).app
        : (payload as Record<string, unknown> | null)

    const appId =
      (app?.id as string | undefined) ||
      (app?.appId as string | undefined) ||
      ((data as { id?: string }).id as string | undefined)

    if (!appId || typeof appId !== "string") {
      return NextResponse.json(
        { success: false, error: "Upstream response missing app id; check APPS_RESOLVE_SUBDOMAIN_PATH" },
        { status: 502 },
      )
    }

    const pwaInstall =
      payload && typeof payload === "object" && "pwaInstall" in payload
        ? (payload as { pwaInstall?: unknown }).pwaInstall
        : app && typeof app === "object" && "pwaInstall" in app
          ? (app as { pwaInstall?: unknown }).pwaInstall
          : undefined

    const merchantId = pickMerchantId(app, payload as Record<string, unknown> | null, data as Record<string, unknown>)

    return NextResponse.json({
      success: true,
      data: {
        appId,
        subdomain: (app?.subdomain as string | undefined) || subdomain,
        ...(merchantId ? { merchantId } : {}),
        ...(pwaInstall != null && typeof pwaInstall === "object" ? { pwaInstall } : {}),
      },
    })
  } catch (e) {
    console.error("[resolve-subdomain]", e)
    return NextResponse.json({ success: false, error: "Failed to resolve subdomain" }, { status: 500 })
  }
}
