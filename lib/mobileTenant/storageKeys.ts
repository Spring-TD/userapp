/**
 * Browser sessionStorage key names (strings only — not .env variables).
 * Values stay stable so existing sessions keep working after renames of the exports.
 */
export const TENANT_APP_ID_STORAGE_KEY = "mobile-v2-tenant-app-id"
export const TENANT_MERCHANT_ID_STORAGE_KEY = "mobile-v2-tenant-merchant-id"
/** Cached `pwaManifest` JSON from last successful resolve (survives flaky upstream). */
export const TENANT_PWA_MANIFEST_STORAGE_KEY = "mobile-v2-tenant-pwa-manifest"
