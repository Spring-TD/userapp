/**
 * Set NEXT_PUBLIC_MERCHANT_COMPLIANCE_BYPASS=true in .env.local (or .env) to skip the
 * merchant KYC redirect/gate and unlock the merchant sidebar when compliance APIs are down.
 * Remove or set false before production.
 */
export function isMerchantComplianceBypassEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MERCHANT_COMPLIANCE_BYPASS === "true"
}
