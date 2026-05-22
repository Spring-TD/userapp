export function commodityDetailHref(productId: string) {
  return `/mobile-v2/products/commodity/${encodeURIComponent(productId)}`
}
