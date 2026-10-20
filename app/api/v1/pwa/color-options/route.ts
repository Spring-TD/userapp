import { NextResponse } from "next/server"
import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"

const API_UPSTREAM_BASE = getApiUpstreamBase()

/** Public — GET /api/v1/pwa/color-options (Create App MS). */
export async function GET() {
  try {
    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/pwa/color-options`, {
      headers: { "Content-Type": "application/json" },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: (data as { error?: string }).error || "Failed to fetch color options" },
        { status: response.status },
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("[pwa/color-options]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
