import { sanitizeProductId } from '@/lib/sanitizeProductId'

export function mortgageOfferStartHref(productId: string) {
  return `/mobile-v2/products/mortgage/offer/start?productId=${encodeURIComponent(sanitizeProductId(productId))}`
}

export function mortgageOfferHref(productId: string, downPayment: boolean) {
  const qs = new URLSearchParams({
    productId: sanitizeProductId(productId),
    downPayment: downPayment ? '1' : '0',
  })
  return `/mobile-v2/products/mortgage/offer?${qs.toString()}`
}

export { mortgageDetailHref } from '@/lib/mortgageApplyRoutes'
