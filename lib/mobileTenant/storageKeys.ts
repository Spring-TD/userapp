/**
 * Browser sessionStorage key names (strings only — not .env variables).
 * Values stay stable so existing sessions keep working after renames of the exports.
 */
export const TENANT_APP_ID_STORAGE_KEY = "mobile-v2-tenant-app-id"
export const TENANT_MERCHANT_ID_STORAGE_KEY = "mobile-v2-tenant-merchant-id"
/** Storefront subdomain slug (e.g. crbc) for registration body + gateway headers. */
export const TENANT_SUBDOMAIN_STORAGE_KEY = "mobile-v2-tenant-subdomain"
/** Cached `pwaManifest` JSON from last successful resolve (survives flaky upstream). */
export const TENANT_PWA_MANIFEST_STORAGE_KEY = "mobile-v2-tenant-pwa-manifest"
/** Client-auth user id from login/profile — use for `GET /wallets/user/{userId}`. */
export const AUTH_USER_ID_STORAGE_KEY = "mobile-v2-auth-user-id"
