import {
  TENANT_APP_ID_STORAGE_KEY,
  TENANT_MERCHANT_ID_STORAGE_KEY,
  TENANT_SUBDOMAIN_STORAGE_KEY,
} from "@/lib/mobileTenant/storageKeys"

/** Attach storefront tenant headers from sessionStorage (browser only). */
export function attachTenantHeaders(headers: Headers | Record<string, string>) {
  if (typeof window === "undefined") return

  const set = (key: string, value: string | null | undefined) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    if (headers instanceof Headers) {
      headers.set(key, trimmed)
    } else {
      headers[key] = trimmed
    }
  }

  try {
    set("x-tenant-app-id", sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY))
    set("x-tenant-merchant-id", sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY))
    set("x-tenant-subdomain", sessionStorage.getItem(TENANT_SUBDOMAIN_STORAGE_KEY))
  } catch {
    /* ignore */
  }
}
