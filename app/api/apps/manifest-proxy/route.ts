import { NextRequest, NextResponse } from "next/server"

import { proxyManifestUrlToNextResponse } from "@/lib/server/proxyAppPwaManifest"

export const dynamic = "force-dynamic"

/** Proxies `GET {pwaInstall.manifestUrl}` when that URL matches the configured API host and manifest path. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")?.trim()
  if (!raw) {
    return NextResponse.json({ success: false, error: "Missing url" }, { status: 400 })
  }
  return proxyManifestUrlToNextResponse(raw)
}
