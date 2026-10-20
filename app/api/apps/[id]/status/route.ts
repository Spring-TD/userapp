import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export const dynamic = "force-dynamic"

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL || "https://account-ms.fly.dev"
const APPS_BASE_URL = AUTH_SERVICE_URL.replace(/\/$/, "")

/** PATCH /api/v1/apps/:id/status — active | suspended */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get("authorization")
    const body = await request.json()
    const status = typeof body?.status === "string" ? body.status.trim() : ""

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 })
    }
    if (status !== "active" && status !== "suspended") {
      return NextResponse.json(
        { success: false, error: 'status must be "active" or "suspended"' },
        { status: 400 },
      )
    }

    const response = await axios.patch(
      `${APPS_BASE_URL}/api/v1/apps/${id}/status`,
      { status },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      },
    )

    return NextResponse.json(response.data, { status: response.status })
  } catch (error: unknown) {
    const err = error as { response?: { data?: unknown; status?: number }; message?: string }
    console.error("Error patching app status:", err.response?.data || err.message)
    return NextResponse.json(
      {
        success: false,
        error:
          (err.response?.data as { error?: string })?.error ||
          err.message ||
          "Failed to update app status",
      },
      { status: err.response?.status || 500 },
    )
  }
}
