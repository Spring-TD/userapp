import type { MobileProduct } from "@/lib/storefrontProducts"

const base = {
  type: "Commodity" as const,
  appId: "demo",
  status: "complete",
  isActive: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

export type CommodityCatalogProduct = MobileProduct & {
  minPurchase: number
  roi: string
  startDate: string
  maturityDate: string
  refNo: string
  total: number
}

export const DUMMY_COMMODITIES: CommodityCatalogProduct[] = [
  {
    ...base,
    id: "dummy-commodity-maize",
    referenceNumber: "rf5463hguy",
    name: "Maize Investment",
    description:
      "Lorem ipsum dolor sit amet consectetur. Malesuada volutpat risus adipiscing nunc amet dolor eu fermentum. Sollicitu...",
    image:
      "https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=1200&auto=format&fit=crop",
    price: 60_000_000,
    propertyValue: 60_000_000,
    duration: "06 months",
    interestRate: "3% ROI",
    minPurchase: 60_700_000,
    roi: "12%",
    startDate: "Mar 2026",
    maturityDate: "Mar 2027",
    refNo: "rf5463hguy",
    total: 60_830_842,
  },
  {
    ...base,
    id: "dummy-commodity-grain",
    referenceNumber: "GRN-120M",
    name: "Grain Investment",
    description:
      "World's top marketer by Forbes, Entrepreneur and Inc Magazines; Writer for Time Magazine with ...",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=1200&auto=format&fit=crop",
    price: 12_000_000,
    propertyValue: 12_000_000,
    duration: "12 months",
    interestRate: "3% ROI",
    minPurchase: 12_000_000,
    roi: "12%",
    startDate: "Mar 2026",
    maturityDate: "Mar 2027",
    refNo: "gr120m9k",
    total: 12_240_000,
  },
  {
    ...base,
    id: "dummy-commodity-auto",
    referenceNumber: "AUT-240M",
    name: "Auto Commodity",
    description:
      "World's top marketer by Forbes, Entrepreneur and Inc Magazines; Writer for Time Magazine with ...",
    image:
      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop",
    price: 240_000_000,
    propertyValue: 240_000_000,
    duration: "12 months",
    interestRate: "3% ROI",
    minPurchase: 240_000_000,
    roi: "12%",
    startDate: "Mar 2026",
    maturityDate: "Mar 2027",
    refNo: "au240m2r",
    total: 244_800_000,
  },
  {
    ...base,
    id: "dummy-commodity-cassava",
    referenceNumber: "CAS-48M",
    name: "Cassava Investment",
    description:
      "World's top marketer by Forbes, Entrepreneur and Inc Magazines; Writer for Time Magazine with ...",
    image:
      "https://images.unsplash.com/photo-1605197183305-f5481399fdc1?q=80&w=1200&auto=format&fit=crop",
    price: 48_000_000,
    propertyValue: 48_000_000,
    duration: "12 months",
    interestRate: "3% ROI",
    minPurchase: 48_000_000,
    roi: "12%",
    startDate: "Mar 2026",
    maturityDate: "Mar 2027",
    refNo: "ca48m3t",
    total: 48_960_000,
  },
]

export function asCommodityCatalogProduct(product: MobileProduct): CommodityCatalogProduct {
  const amount = product.price ?? product.propertyValue ?? 60_000_000
  const roi = product.interestRate?.includes("ROI")
    ? product.interestRate
    : product.interestRate
      ? `${product.interestRate} ROI`
      : "3% ROI"

  return {
    ...product,
    price: amount,
    propertyValue: amount,
    duration: product.duration || "06 months",
    interestRate: roi,
    minPurchase: amount,
    roi: roi.replace(" ROI", ""),
    startDate: "Mar 2026",
    maturityDate: "Mar 2027",
    refNo: product.referenceNumber || "rf5463hguy",
    total: Math.round(amount * 1.00218),
  }
}

export function buildCommodityCatalogFromProducts(products: MobileProduct[]): {
  featured: CommodityCatalogProduct
  commodities: CommodityCatalogProduct[]
} {
  if (products.length === 0) {
    return {
      featured: DUMMY_COMMODITIES[0],
      commodities: DUMMY_COMMODITIES,
    }
  }

  const mapped = products.map(asCommodityCatalogProduct)
  return {
    featured: mapped[0] ?? DUMMY_COMMODITIES[0],
    commodities: mapped.length > 0 ? mapped : DUMMY_COMMODITIES,
  }
}

export function getDummyCommodityById(id: string): CommodityCatalogProduct | undefined {
  return DUMMY_COMMODITIES.find((product) => product.id === id)
}
