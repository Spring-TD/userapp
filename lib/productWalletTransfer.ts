import type { ProductApplication } from '@/types/productApplication'

/**
 * Spendable balance on the product application wallet.
 * Never fall back to `application.amount` — that is the loan/product principal,
 * not the remaining transferable wallet balance.
 */
export function productWalletAvailableBalance(application: ProductApplication): number {
  const wallet = application.productWallet
  const upstream = wallet?.upstreamAccount
  const candidates = [
    wallet?.mainBalance,
    wallet?.balance,
    upstream?.mainBalance,
    upstream?.balance,
  ]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  }
  return 0
}

export function canTransferProductWalletToPrimary(
  application: ProductApplication,
  options?: { allowCommodity?: boolean },
): boolean {
  const type = String(application.productType || '').toUpperCase()
  if (!options?.allowCommodity && type === 'COMMODITY') return false
  if (!application.id) return false

  const status = String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  if (
    status.includes('reject') ||
    status.includes('cancel') ||
    status.includes('pending') ||
    status.includes('draft')
  ) {
    return false
  }

  // After a full transfer the wallet balance is 0 — keep the CTA inactive.
  return productWalletAvailableBalance(application) > 0
}

/** Clear product-wallet balances after a successful transfer-to-primary. */
export function withZeroProductWallet(
  application: ProductApplication,
  applicationId: string,
): ProductApplication {
  if (application.id !== applicationId) return application
  const wallet = application.productWallet
  const upstream = wallet?.upstreamAccount
  return {
    ...application,
    productWallet: {
      ...wallet,
      balance: 0,
      mainBalance: 0,
      upstreamAccount: upstream
        ? {
            ...upstream,
            balance: 0,
            mainBalance: 0,
          }
        : upstream,
    },
  }
}
