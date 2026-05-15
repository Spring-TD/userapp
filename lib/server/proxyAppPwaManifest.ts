import { NextResponse } from "next/server"

import { getApiBaseUrl } from "@/lib/apiBaseUrl"

const APP_ID_RE = /^[a-zA-Z\d_-]{8,128}$/
const UPSTREAM_MS = 25_000

const MANIFEST_PATH_RE = /^\/api\/v\d+\/apps\/[^/]+\/pwa\/manifest\.webmanifest$/i

/**
 * Only fetch URLs that point at the configured API host and the known manifest path
 * (same contract as `pwaInstall.manifestUrl` from resolve).
 */
export function isAllowedPwaManifestUpstreamUrl(urlStr: string): boolean {
  const base = getApiBaseUrl()
  let u: URL
  let b: URL
  try {
    u = new URL(urlStr)
    b = new URL(base.match(/^https?:\/\//i) ? base : `https://${base}`)
  } catch {
    return false
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false
  if (u.username || u.password) return false
  if (u.hostname !== b.hostname) return false
  const bp = b.port || (b.protocol === "https:" ? "443" : "80")
  const up = u.port || (u.protocol === "https:" ? "443" : "80")
  if (up !== bp) return false
  if (!MANIFEST_PATH_RE.test(u.pathname)) return false
  return true
}

export function parseAppIdParam(raw: string | undefined): string | null {
  const appId = decodeURIComponent(raw || "").trim()
  if (!appId || !APP_ID_RE.test(appId)) return null
  return appId
}

/** Proxies `GET /api/v1/apps/{id}/pwa/manifest.webmanifest` from `NEXT_PUBLIC_API_URL`. */
export async function proxyAppManifestToNextResponse(appId: string): Promise<NextResponse> {
  const base = getApiBaseUrl()
  const url = `${base}/api/v1/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/manifest+json, application/json, */*" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_MS),
    })

    const body = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: body.slice(0, 200) || "Manifest not available" },
        { status: upstream.status === 404 ? 404 : upstream.status || 502 },
      )
    }

    const ct = upstream.headers.get("content-type") || "application/manifest+json"
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": ct.split(";")[0].trim(),
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      },
    })
  } catch (e) {
    console.error("[pwa/manifest proxy]", e)
    return NextResponse.json({ success: false, error: "Failed to load manifest" }, { status: 502 })
  }
}

/** Proxies `GET` of an absolute manifest URL after {@link isAllowedPwaManifestUpstreamUrl} check. */
export async function proxyManifestUrlToNextResponse(manifestUrl: string): Promise<NextResponse> {
  if (!isAllowedPwaManifestUpstreamUrl(manifestUrl)) {
    return NextResponse.json({ success: false, error: "URL not allowed" }, { status: 400 })
  }

  try {
    const upstream = await fetch(manifestUrl, {
      method: "GET",
      headers: { Accept: "application/manifest+json, application/json, */*" },
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_MS),
    })

    const body = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: body.slice(0, 200) || "Manifest not available" },
        { status: upstream.status === 404 ? 404 : upstream.status || 502 },
      )
    }

    const ct = upstream.headers.get("content-type") || "application/manifest+json"
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": ct.split(";")[0].trim(),
        "Cache-Control": "public, max-age=120, stale-while-revalidate=300",
      },
    })
  } catch (e) {
    console.error("[pwa/manifest-proxy url]", e)
    return NextResponse.json({ success: false, error: "Failed to load manifest" }, { status: 502 })
  }
}
