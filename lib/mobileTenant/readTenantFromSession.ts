import {
  TENANT_APP_ID_STORAGE_KEY,
  TENANT_MERCHANT_ID_STORAGE_KEY,
  TENANT_SUBDOMAIN_STORAGE_KEY,
} from "@/lib/mobileTenant/storageKeys"

/** Fallback when React context is stale — e.g. after hot reload. */
export function readTenantFromSession() {
  if (typeof window === "undefined") {
    return { appId: null as string | null, merchantId: null as string | null, subdomain: null as string | null }
  }
  try {
    return {
      appId: sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() || null,
      merchantId: sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY)?.trim() || null,
      subdomain: sessionStorage.getItem(TENANT_SUBDOMAIN_STORAGE_KEY)?.trim().toLowerCase() || null,
    }
  } catch {
    return { appId: null, merchantId: null, subdomain: null }
  }
}
