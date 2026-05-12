/**
 * Optional payload from Create App MS on subdomain resolve (`data.pwaInstall`).
 * Storefront uses same-origin proxies when URLs are absent.
 */
export type StorefrontPwaInstallPayload = {
  manifestUrl?: string
  swJsUrl?: string
  name?: string
  description?: string
  icon?: string
  [key: string]: unknown
}
