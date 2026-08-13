/**
 * Public storefront branding from KYC (no auth).
 * Gateway: GET /api/v1/kyc/merchants/{merchantId}/branding
 */

export type MerchantBranding = {
  merchantId?: string
  ownerUserId?: string
  companyName: string | null
  companyLogoUrl: string | null
  website: string | null
}

function pickBranding(json: unknown): MerchantBranding | null {
  const root = json as { data?: Record<string, unknown>; success?: boolean }
  const data = (root?.data && typeof root.data === "object" ? root.data : root) as Record<
    string,
    unknown
  > | null
  if (!data || typeof data !== "object") return null

  return {
    merchantId: typeof data.merchantId === "string" ? data.merchantId : undefined,
    ownerUserId: typeof data.ownerUserId === "string" ? data.ownerUserId : undefined,
    companyName:
      typeof data.companyName === "string" && data.companyName.trim()
        ? data.companyName.trim()
        : null,
    companyLogoUrl:
      typeof data.companyLogoUrl === "string" && data.companyLogoUrl.trim()
        ? data.companyLogoUrl.trim()
        : null,
    website: typeof data.website === "string" && data.website.trim() ? data.website.trim() : null,
  }
}

/**
 * Fetch KYC branding for a tenant merchant. Returns null on 404 / missing logo profile.
 * Uses same-origin BFF so tenant host can proxy `/api/v1/kyc`.
 */
export async function fetchMerchantBranding(merchantId: string): Promise<MerchantBranding | null> {
  const id = merchantId.trim()
  if (!id) return null

  const res = await fetch(`/api/v1/kyc/merchants/${encodeURIComponent(id)}/branding`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
  })

  if (res.status === 404) return null
  if (!res.ok) {
    // Soft-fail: missing branding must not break the storefront shell.
    return null
  }

  const json = await res.json().catch(() => null)
  return pickBranding(json)
}
