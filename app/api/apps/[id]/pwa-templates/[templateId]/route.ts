import { NextRequest, NextResponse } from "next/server"

import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"

const API_UPSTREAM_BASE = getApiUpstreamBase()

// GET - Get a specific template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const { id: appId, templateId } = await params
    const authHeader = request.headers.get("Authorization")

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to fetch template" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const { id: appId, templateId } = await params
    const authHeader = request.headers.get("Authorization")
    const body = await request.json()

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to update template" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateId: string }> },
) {
  try {
    const { id: appId, templateId } = await params
    const authHeader = request.headers.get("Authorization")

    const response = await fetch(`${API_UPSTREAM_BASE}/api/v1/apps/${appId}/pwa-templates/${templateId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Failed to delete template" },
        { status: response.status },
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
