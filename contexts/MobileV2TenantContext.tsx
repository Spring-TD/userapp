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
import type { StorefrontPwaInstallPayload } from "@/lib/storefrontPwaTypes"

const STORAGE_APP_ID = "mobile-v2-tenant-app-id"
const STORAGE_MERCHANT_ID = "mobile-v2-tenant-merchant-id"

interface MobileV2TenantState {
  /** Resolved Spring / Create-App id used for config + products */
  appId: string | null
  /** Merchant / tenant user id for retail signup (`x-tenant-merchant-id`), from subdomain resolve or `?merchant_id=` */
  merchantId: string | null
  /** Slug from host or ?subdomain= */
  tenantSubdomain: string | null
  /** From resolve endpoint `data.pwaInstall` when present (Create App MS) */
  pwaInstall: StorefrontPwaInstallPayload | null
  /** False until first client resolution pass finishes */
  ready: boolean
  /** Last resolution error (e.g. unknown subdomain) */
  error: string | null
}

interface MobileV2TenantContextValue extends MobileV2TenantState {
  /** Clear stored tenant (e.g. sign-out to default app) */
  clearTenant: () => void
}

const MobileV2TenantContext = createContext<MobileV2TenantContextValue | undefined>(undefined)

async function fetchTenantBySubdomain(slug: string): Promise<{
  appId: string
  merchantId: string | null
  pwaInstall: StorefrontPwaInstallPayload | null
}> {
  const res = await fetch(`/api/apps/resolve-subdomain/${encodeURIComponent(slug)}`)
  const json = (await res.json()) as {
    success?: boolean
    data?: { appId?: string; merchantId?: string; pwaInstall?: StorefrontPwaInstallPayload }
    error?: string
  }
  if (!res.ok || !json.success || !json.data?.appId) {
    throw new Error(json.error || "Could not resolve store")
  }
  const pi = json.data.pwaInstall
  const mid = json.data.merchantId?.trim() || null
  return {
    appId: json.data.appId,
    merchantId: mid,
    pwaInstall: pi && typeof pi === "object" ? pi : null,
  }
}

function readStoredMerchantId(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_MERCHANT_ID)?.trim()
    return v || null
  } catch {
    return null
  }
}

export function MobileV2TenantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams?.toString() ?? ""

  const [appId, setAppId] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null)
  const [pwaInstall, setPwaInstall] = useState<StorefrontPwaInstallPayload | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearTenant = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_APP_ID)
      sessionStorage.removeItem(STORAGE_MERCHANT_ID)
    } catch {
      /* ignore */
    }
    setAppId(null)
    setMerchantId(null)
    setTenantSubdomain(null)
    setPwaInstall(null)
    setError(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setError(null)
      const rootDomain =
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MOBILE_ROOT_DOMAIN?.trim()) || ""
      const fallbackEnvAppId = process.env.NEXT_PUBLIC_SPRING_APP_ID?.trim() || null

      let nextAppId: string | null = null
      let nextMerchantId: string | null = null
      let nextSlug: string | null = null

      try {
        const params = new URLSearchParams(searchKey || window.location.search)
        const appIdParam = params.get("appId")?.trim() || null
        const subdomainParam = params.get("subdomain")?.trim().toLowerCase() || null
        const merchantIdParam = params.get("merchant_id")?.trim() || null

        let storedApp: string | null = null
        try {
          storedApp = sessionStorage.getItem(STORAGE_APP_ID)
        } catch {
          storedApp = null
        }

        const hostSub = getTenantSubdomainFromHost(window.location.hostname, rootDomain || null)

        let nextPwaInstall: StorefrontPwaInstallPayload | null = null

        if (merchantIdParam) {
          nextMerchantId = merchantIdParam
        }

        if (appIdParam) {
          nextAppId = appIdParam
          if (!nextMerchantId) nextMerchantId = readStoredMerchantId()
        } else if (subdomainParam) {
          nextSlug = subdomainParam
          const t = await fetchTenantBySubdomain(subdomainParam)
          nextAppId = t.appId
          nextMerchantId = nextMerchantId || t.merchantId
          nextPwaInstall = t.pwaInstall
        } else if (storedApp) {
          nextAppId = storedApp
          if (!nextMerchantId) nextMerchantId = readStoredMerchantId()
        } else if (hostSub) {
          nextSlug = hostSub
          const t = await fetchTenantBySubdomain(hostSub)
          nextAppId = t.appId
          nextMerchantId = nextMerchantId || t.merchantId
          nextPwaInstall = t.pwaInstall
        } else if (fallbackEnvAppId) {
          nextAppId = fallbackEnvAppId
          if (!nextMerchantId) nextMerchantId = readStoredMerchantId()
        }

        if (cancelled) return

        if (nextAppId) {
          try {
            sessionStorage.setItem(STORAGE_APP_ID, nextAppId)
          } catch {
            /* ignore */
          }
        }
        if (nextMerchantId) {
          try {
            sessionStorage.setItem(STORAGE_MERCHANT_ID, nextMerchantId)
          } catch {
            /* ignore */
          }
        } else {
          try {
            sessionStorage.removeItem(STORAGE_MERCHANT_ID)
          } catch {
            /* ignore */
          }
        }

        setAppId(nextAppId)
        setMerchantId(nextMerchantId)
        setTenantSubdomain(nextSlug)
        setPwaInstall(nextPwaInstall)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : "Tenant resolution failed")
        setAppId(fallbackEnvAppId)
        setMerchantId(readStoredMerchantId())
        setTenantSubdomain(null)
        setPwaInstall(null)
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
      ready,
      error,
      clearTenant,
    }),
    [appId, merchantId, tenantSubdomain, pwaInstall, ready, error, clearTenant],
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
