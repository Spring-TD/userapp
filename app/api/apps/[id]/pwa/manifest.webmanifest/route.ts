import { NextRequest, NextResponse } from "next/server"

import { getApiUpstreamBase } from "@/lib/server/apiUpstreamBase"
import { fetchUpstream, isUpstreamTimeoutError, upstreamErrorMessage } from "@/lib/server/upstreamFetch"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: appId } = await params
  const authHeader = request.headers.get("Authorization")
  const base = getApiUpstreamBase()

  try {
    const response = await fetchUpstream(
      `${base}/api/v1/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`,
      {
        method: "GET",
        headers: {
          Accept: "application/manifest+json, application/json, */*",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      },
    )

    const contentType = response.headers.get("content-type") || "application/manifest+json"
    const body = await response.arrayBuffer()
    const cacheControl = response.headers.get("cache-control")
    const etag = response.headers.get("etag")

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Manifest not available" },
        { status: response.status === 404 ? 404 : response.status || 502 },
      )
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0].trim(),
        ...(cacheControl ? { "Cache-Control": cacheControl } : { "Cache-Control": "public, max-age=120" }),
        ...(etag ? { ETag: etag } : {}),
      },
    })
  } catch (error) {
    const timeout = isUpstreamTimeoutError(error)
    console.error(`Error proxying PWA manifest for app ${appId} (upstream=${base}):`, error)
    return NextResponse.json(
      {
        success: false,
        error: upstreamErrorMessage(error, "Failed to reach PWA manifest upstream"),
      },
      { status: timeout ? 504 : 502 },
    )
  }
}
