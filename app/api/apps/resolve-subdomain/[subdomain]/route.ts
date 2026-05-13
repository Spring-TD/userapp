import { NextRequest, NextResponse } from "next/server"

import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"
import { isReservedSubdomain } from "@/lib/mobileTenant/subdomain"

export const dynamic = "force-dynamic"

const API_UPSTREAM_BASE = getApiUpstreamBase()


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

    return NextResponse.json({
      success: true,
      data: {
        appId,
        subdomain: (app?.subdomain as string | undefined) || subdomain,
        ...(pwaInstall != null && typeof pwaInstall === "object" ? { pwaInstall } : {}),
      },
    })
  } catch (e) {
    console.error("[resolve-subdomain]", e)
    return NextResponse.json({ success: false, error: "Failed to resolve subdomain" }, { status: 500 })
  }
}
