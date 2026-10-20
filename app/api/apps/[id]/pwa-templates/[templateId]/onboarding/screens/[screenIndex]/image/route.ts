import { NextRequest, NextResponse } from "next/server"
import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"

const API_UPSTREAM_BASE = getApiUpstreamBase()

/** POST multipart field `file` — screenIndex is 0-based per API docs. */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params:
      | Promise<{ id: string; templateId: string; screenIndex: string }>
      | { id: string; templateId: string; screenIndex: string }
  },
) {
  try {
    const { id: appId, templateId, screenIndex } = await Promise.resolve(params)
    const authHeader = request.headers.get("Authorization")
    const formData = await request.formData()

    const response = await fetch(
      `${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}/onboarding/screens/${screenIndex}/image`,
      {
        method: "POST",
        headers: authHeader ? { Authorization: authHeader } : {},
        body: formData,
      },
    )

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: (data as { error?: string }).error || "Onboarding image upload failed" },
        { status: response.status },
      )
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error("[pwa onboarding image]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
