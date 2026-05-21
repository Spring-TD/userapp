export function loanApplyHref(productId: string) {
  return `/mobile-v2/products/loan/apply?productId=${encodeURIComponent(productId)}`
}

export function loanDetailHref(productId: string) {
  return `/mobile-v2/products/loan/${encodeURIComponent(productId)}`
}

export function loanApplyStartHref(productId: string) {
  return `/mobile-v2/products/loan/apply/start?productId=${encodeURIComponent(productId)}`
}

export function loanAccountSuccessHref(productId: string) {
  return `/mobile-v2/products/loan/account-success?productId=${encodeURIComponent(productId)}`
}

export function isDummyLoanProductId(productId: string | null | undefined) {
  return Boolean(productId?.startsWith("dummy-"))
}
