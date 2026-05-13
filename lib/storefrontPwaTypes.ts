
export type StorefrontPwaInstallPayload = {
  manifestUrl?: string
  serviceWorkerUrl?: string
  pwaEntryUrl?: string
  version?: string
  /** Legacy / alternate field name */
  swJsUrl?: string
  name?: string
  description?: string
  icon?: string
  [key: string]: unknown
}
