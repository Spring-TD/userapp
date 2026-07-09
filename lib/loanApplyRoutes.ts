import { sanitizeProductId } from '@/lib/sanitizeProductId'

export function loanApplyHref(productId: string) {
  return `/mobile-v2/products/loan/apply?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function loanPendingDetailHref(applicationId: string) {
  return `/mobile-v2/products/loan/pending/${encodeURIComponent(applicationId)}`
}

export function loanDetailHref(productId: string) {
  return `/mobile-v2/products/loan/${encodeURIComponent(sanitizeProductId(productId))}`
}

export function loanProductApplyDetailHref(productId: string) {
  return `${loanDetailHref(productId)}?tab=details`
}

export function loanApplyStartHref(productId: string) {
  return `/mobile-v2/products/loan/apply/start?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function loanAccountSuccessHref(productId: string) {
  return `/mobile-v2/products/loan/account-success?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}
