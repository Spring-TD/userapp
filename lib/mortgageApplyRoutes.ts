import { sanitizeProductId } from '@/lib/sanitizeProductId'

export function mortgageApplyHref(productId: string) {
  return `/mobile-v2/products/mortgage/apply?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function mortgageApplyStartHref(productId: string) {
  return `/mobile-v2/products/mortgage/apply/start?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function mortgageApplyChoosePaymentHref(productId: string) {
  return `/mobile-v2/products/mortgage/apply/choose-payment?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function mortgagePendingDetailHref(applicationId: string) {
  return `/mobile-v2/products/mortgage/pending/${encodeURIComponent(applicationId)}`
}

export function mortgageDetailHref(productId: string) {
  return `/mobile-v2/products/mortgage/${encodeURIComponent(sanitizeProductId(productId))}`
}

export function mortgageProductApplyDetailHref(productId: string) {
  return `${mortgageDetailHref(productId)}?tab=details`
}

export function mortgageAccountSuccessHref(productId: string) {
  return `/mobile-v2/products/mortgage/account-success?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}
