import type { MobileProduct } from "@/lib/storefrontProducts"

export type CommodityCatalogProduct = MobileProduct & {
  minPurchase: number
  roi: string
  startDate: string
  maturityDate: string
  refNo: string
  total: number
}

export function asCommodityCatalogProduct(product: MobileProduct): CommodityCatalogProduct {
  const amount = product.price ?? product.propertyValue ?? product.amountMax ?? product.amountMin ?? 0
  const roi = product.roi
    ? `${product.roi} ROI`
    : product.interestRate?.includes("ROI")
    ? product.interestRate
    : product.interestRate
      ? `${product.interestRate} ROI`
      : "ROI available"
  const minPurchase = product.minimumQuantity != null ? amount * product.minimumQuantity : product.amountMin ?? amount

  return {
    ...product,
    price: amount,
    propertyValue: amount,
    duration: product.duration || "Not specified",
    interestRate: roi,
    minPurchase,
    roi: roi.replace(" ROI", ""),
    startDate: "Not specified",
    maturityDate: "Not specified",
    refNo: product.referenceNumber || product.id,
    total: Math.round(amount),
  }
}
