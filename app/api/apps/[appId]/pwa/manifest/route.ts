import { NextRequest, NextResponse } from "next/server"

import { parseAppIdParam, proxyAppManifestToNextResponse } from "@/lib/server/proxyAppPwaManifest"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId: raw } = await params
  const appId = parseAppIdParam(raw)
  if (!appId) {
    return NextResponse.json({ success: false, error: "Invalid app id" }, { status: 400 })
  }
  return proxyAppManifestToNextResponse(appId)
}
