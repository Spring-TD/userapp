export function mortgageApplyHref(productId: string) {
  return `/mobile-v2/products/mortgage/apply?productId=${encodeURIComponent(productId)}`
}

export function mortgageApplyStartHref(productId: string) {
  return `/mobile-v2/products/mortgage/apply/start?productId=${encodeURIComponent(productId)}`
}

export function mortgageDetailHref(productId: string) {
  return `/mobile-v2/products/mortgage/${encodeURIComponent(productId)}`
}

export function mortgageProductApplyDetailHref(productId: string) {
  return `${mortgageDetailHref(productId)}?tab=details`
}

export function mortgageAccountSuccessHref(productId: string) {
  return `/mobile-v2/products/mortgage/account-success?productId=${encodeURIComponent(productId)}`
}
