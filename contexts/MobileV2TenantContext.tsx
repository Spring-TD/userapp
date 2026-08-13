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
import {
  TENANT_APP_ID_STORAGE_KEY,
  TENANT_MERCHANT_ID_STORAGE_KEY,
  TENANT_PWA_MANIFEST_STORAGE_KEY,
  TENANT_SUBDOMAIN_STORAGE_KEY,
} from "@/lib/mobileTenant/storageKeys"
import type { StorefrontPwaInstallPayload } from "@/lib/storefrontPwaTypes"
import { parseWebAppManifestBranding, storefrontDisplayName, type WebAppManifestBranding } from "@/lib/webAppManifest"
import { fetchMerchantBranding, type MerchantBranding } from "@/lib/merchantBrandingApi"

interface MobileV2TenantState {
  appId: string | null
  merchantId: string | null
  tenantSubdomain: string | null
  pwaInstall: StorefrontPwaInstallPayload | null
  pwaManifest: WebAppManifestBranding | null
  /** KYC branding for storefront logo (`companyLogoUrl`). */
  branding: MerchantBranding | null
  displayName: string | null
  ready: boolean
  error: string | null
}

interface MobileV2TenantContextValue extends MobileV2TenantState {
  clearTenant: () => void
}

const MobileV2TenantContext = createContext<MobileV2TenantContextValue | undefined>(undefined)

/** Proxies `GET /api/v1/apps/resolve/{subdomain}` — includes `pwaManifest` + optional `pwaInstall`. */
async function resolveSubdomain(slug: string) {
  const res = await fetch(`/api/v1/apps/resolve/${encodeURIComponent(slug)}`)
  const json = (await res.json()) as {
    success?: boolean
    data?: {
      id?: string
      appId?: string
      merchantId?: string
      subdomain?: string
      pwaInstall?: StorefrontPwaInstallPayload
      pwaManifest?: unknown
    }
    error?: string
  }
  const data = json.data
  const appId = data?.id || data?.appId
  if (!res.ok || !json.success || !data || !appId) {
    throw new Error(json.error || "Could not resolve store")
  }
  return {
    appId,
    merchantId: data.merchantId?.trim() || null,
    subdomain: data.subdomain?.trim().toLowerCase() || slug,
    pwaInstall: data.pwaInstall && typeof data.pwaInstall === "object" ? data.pwaInstall : null,
    pwaManifest: parseWebAppManifestBranding(data.pwaManifest),
  }
}

function readCachedManifest(): WebAppManifestBranding | null {
  try {
    const raw = sessionStorage.getItem(TENANT_PWA_MANIFEST_STORAGE_KEY)
    if (!raw) return null
    return parseWebAppManifestBranding(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

function readCachedSubdomain(): string | null {
  try {
    return sessionStorage.getItem(TENANT_SUBDOMAIN_STORAGE_KEY)?.trim().toLowerCase() || null
  } catch {
    return null
  }
}

function displayNameFromSubdomain(subdomain: string | null): string | null {
  if (!subdomain) return null
  return subdomain
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || null
}

function persist(
  appId: string | null,
  merchantId: string | null,
  subdomain: string | null,
  pwaManifest: WebAppManifestBranding | null,
) {
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
  try {
    if (subdomain) sessionStorage.setItem(TENANT_SUBDOMAIN_STORAGE_KEY, subdomain)
    else sessionStorage.removeItem(TENANT_SUBDOMAIN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  try {
    if (pwaManifest) sessionStorage.setItem(TENANT_PWA_MANIFEST_STORAGE_KEY, JSON.stringify(pwaManifest))
    else sessionStorage.removeItem(TENANT_PWA_MANIFEST_STORAGE_KEY)
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
  const storedSubdomain = readCachedSubdomain()
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
  let pwaManifest: WebAppManifestBranding | null = null
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
      pwaManifest = readCachedManifest()
    } else if (subdomainParam || hostSub || storedSubdomain) {
      const slug = subdomainParam || hostSub || storedSubdomain!
      tenantSubdomain = slug
      const t = await resolveSubdomain(slug)
      appId = t.appId
      merchantId = merchantId || t.merchantId
      pwaInstall = t.pwaInstall
      pwaManifest = t.pwaManifest
    } else if (storedApp) {
      appId = storedApp
      if (!merchantId) merchantId = readMerchant()
      pwaManifest = readCachedManifest()
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Tenant resolution failed"
    appId = appIdParam || storedApp || readApp()
    merchantId = merchantId || readMerchant()
    tenantSubdomain = subdomainParam || hostSub || null
    pwaInstall = null
    pwaManifest = readCachedManifest()
  }

  persist(appId, merchantId, tenantSubdomain, pwaManifest)

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
  const [branding, setBranding] = useState<MerchantBranding | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearTenant = useCallback(() => {
    try {
      sessionStorage.removeItem(TENANT_APP_ID_STORAGE_KEY)
      sessionStorage.removeItem(TENANT_MERCHANT_ID_STORAGE_KEY)
      sessionStorage.removeItem(TENANT_SUBDOMAIN_STORAGE_KEY)
      sessionStorage.removeItem(TENANT_PWA_MANIFEST_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setAppId(null)
    setMerchantId(null)
    setTenantSubdomain(null)
    setPwaInstall(null)
    setPwaManifest(null)
    setBranding(null)
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

        if (r.merchantId) {
          const b = await fetchMerchantBranding(r.merchantId)
          if (!cancelled) setBranding(b)
        } else if (!cancelled) {
          setBranding(null)
        }
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
      branding,
      displayName:
        branding?.companyName ||
        storefrontDisplayName(pwaManifest) ||
        displayNameFromSubdomain(tenantSubdomain),
      ready,
      error,
      clearTenant,
    }),
    [appId, merchantId, tenantSubdomain, pwaInstall, pwaManifest, branding, ready, error, clearTenant],
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
