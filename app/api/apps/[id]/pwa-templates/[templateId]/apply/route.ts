import { NextRequest, NextResponse } from "next/server"

import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"

const API_UPSTREAM_BASE = getApiUpstreamBase()

// POST - Apply a template to the app's configuration
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const { id: appId, templateId } = await params
    const authHeader = request.headers.get("Authorization")

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}/apply`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to apply template" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error applying template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
