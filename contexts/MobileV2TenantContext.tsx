"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { getTenantSubdomainFromHost } from "@/lib/mobileTenant/subdomain"
import { TENANT_APP_ID_STORAGE_KEY, TENANT_MERCHANT_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"
import type { StorefrontPwaInstallPayload } from "@/lib/storefrontPwaTypes"
import { parseWebAppManifestBranding, storefrontDisplayName, type WebAppManifestBranding } from "@/lib/webAppManifest"

interface MobileV2TenantState {
  appId: string | null
  merchantId: string | null
  tenantSubdomain: string | null
  pwaInstall: StorefrontPwaInstallPayload | null
  pwaManifest: WebAppManifestBranding | null
  displayName: string | null
  ready: boolean
  error: string | null
}

interface MobileV2TenantContextValue extends MobileV2TenantState {
  clearTenant: () => void
}

const MobileV2TenantContext = createContext<MobileV2TenantContextValue | undefined>(undefined)

/**
 * Second hop: Web App Manifest JSON (not in resolve body).
 * After resolve by subdomain: if upstream omits `pwaInstall`, there is no manifest URL — skip fetch.
 * With `pwaInstall.manifestUrl`, use the doc flow `GET manifestUrl` via same-origin proxy.
 */
async function getManifestBranding(
  appId: string,
  pwaInstall: StorefrontPwaInstallPayload | null,
  skipManifestIfNoPwaInstall: boolean,
): Promise<WebAppManifestBranding | null> {
  if (skipManifestIfNoPwaInstall && !pwaInstall) return null
  const manifestUrl = typeof pwaInstall?.manifestUrl === "string" ? pwaInstall.manifestUrl.trim() : ""
  try {
    const req = manifestUrl
      ? `/api/apps/manifest-proxy?url=${encodeURIComponent(manifestUrl)}`
      : `/api/apps/${encodeURIComponent(appId)}/pwa/manifest.webmanifest`
    const res = await fetch(req, { cache: "no-store" })
    if (!res.ok) return null
    return parseWebAppManifestBranding(await res.json())
  } catch {
    return null
  }
}

/** Proxies to `GET /api/v1/apps/resolve/{subdomain}` → `data.id`, `data.merchantId`, optional `pwaInstall` (links only). */
async function resolveSubdomain(slug: string) {
  const res = await fetch(`/api/apps/resolve-subdomain/${encodeURIComponent(slug)}`)
  const json = (await res.json()) as {
    success?: boolean
    data?: { appId?: string; merchantId?: string; pwaInstall?: StorefrontPwaInstallPayload }
    error?: string
  }
  if (!res.ok || !json.success || !json.data?.appId) {
    throw new Error(json.error || "Could not resolve store")
  }
  return {
    appId: json.data.appId,
    merchantId: json.data.merchantId?.trim() || null,
    pwaInstall: json.data.pwaInstall && typeof json.data.pwaInstall === "object" ? json.data.pwaInstall : null,
  }
}

function persist(appId: string | null, merchantId: string | null) {
  try {
    if (appId) sessionStorage.setItem(TENANT_APP_ID_STORAGE_KEY, appId)
    else sessionStorage.removeItem(TENANT_APP_ID_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  try {
    if (merchantId) sessionStorage.setItem(TENANT_MERCHANT_ID_STORAGE_KEY, merchantId)
    else sessionStorage.removeItem(TENANT_MERCHANT_ID_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

async function loadTenantFromNavigation(search: string) {
  const params = new URLSearchParams(search)
  const appIdParam = params.get("appId")?.trim() || null
  const subdomainParam = params.get("subdomain")?.trim().toLowerCase() || null
  const merchantFromQuery = params.get("merchant_id")?.trim() || null

  let storedApp: string | null = null
  try {
    storedApp = sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)
  } catch {
    storedApp = null
  }

  const hostSub =
    typeof window !== "undefined" ? getTenantSubdomainFromHost(window.location.hostname, null) : null

  let appId: string | null = null
  let merchantId: string | null = merchantFromQuery
  let tenantSubdomain: string | null = null
  let pwaInstall: StorefrontPwaInstallPayload | null = null
  let skipManifestIfNoPwaInstall = false
  let error: string | null = null

  const readMerchant = () => {
    try {
      return sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY)?.trim() || null
    } catch {
      return null
    }
  }
  const readApp = () => {
    try {
      return sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() || null
    } catch {
      return null
    }
  }

  try {
    if (appIdParam) {
      appId = appIdParam
      if (!merchantId) merchantId = readMerchant()
    } else if (subdomainParam) {
      tenantSubdomain = subdomainParam
      const t = await resolveSubdomain(subdomainParam)
      appId = t.appId
      merchantId = merchantId || t.merchantId
      pwaInstall = t.pwaInstall
      skipManifestIfNoPwaInstall = true
    } else if (storedApp) {
      appId = storedApp
      if (!merchantId) merchantId = readMerchant()
    } else if (hostSub) {
      tenantSubdomain = hostSub
      const t = await resolveSubdomain(hostSub)
      appId = t.appId
      merchantId = merchantId || t.merchantId
      pwaInstall = t.pwaInstall
      skipManifestIfNoPwaInstall = true
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Tenant resolution failed"
    appId = appIdParam || storedApp || readApp()
    merchantId = merchantId || readMerchant()
    tenantSubdomain = null
    pwaInstall = null
  }

  const pwaManifest = appId ? await getManifestBranding(appId, pwaInstall, skipManifestIfNoPwaInstall) : null

  persist(appId, merchantId)

  return { appId, merchantId, tenantSubdomain, pwaInstall, pwaManifest, error }
}

export function MobileV2TenantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() ?? ""

  const [appId, setAppId] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null)
  const [pwaInstall, setPwaInstall] = useState<StorefrontPwaInstallPayload | null>(null)
  const [pwaManifest, setPwaManifest] = useState<WebAppManifestBranding | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearTenant = useCallback(() => {
    try {
      sessionStorage.removeItem(TENANT_APP_ID_STORAGE_KEY)
      sessionStorage.removeItem(TENANT_MERCHANT_ID_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setAppId(null)
    setMerchantId(null)
    setTenantSubdomain(null)
    setPwaInstall(null)
    setPwaManifest(null)
    setError(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const run = async () => {
      const sk = searchKey || (typeof window !== "undefined" ? window.location.search : "")
      try {
        const r = await loadTenantFromNavigation(sk)
        if (cancelled) return
        setAppId(r.appId)
        setMerchantId(r.merchantId)
        setTenantSubdomain(r.tenantSubdomain)
        setPwaInstall(r.pwaInstall)
        setPwaManifest(r.pwaManifest)
        setError(r.error)
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [pathname, searchKey])

  const value = useMemo(
    () => ({
      appId,
      merchantId,
      tenantSubdomain,
      pwaInstall,
      pwaManifest,
      displayName: storefrontDisplayName(pwaManifest),
      ready,
      error,
      clearTenant,
    }),
    [appId, merchantId, tenantSubdomain, pwaInstall, pwaManifest, ready, error, clearTenant],
  )

  return <MobileV2TenantContext.Provider value={value}>{children}</MobileV2TenantContext.Provider>
}

export function useMobileV2Tenant(): MobileV2TenantContextValue {
  const ctx = useContext(MobileV2TenantContext)
  if (!ctx) {
    throw new Error("useMobileV2Tenant must be used within MobileV2TenantProvider")
  }
  return ctx
}
