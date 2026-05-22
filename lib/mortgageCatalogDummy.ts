import type { MobileProduct } from "@/lib/storefrontProducts"

const base = {
  type: "Mortgage" as const,
  appId: "demo",
  status: "complete",
  isActive: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
}

/** Design mock — matches Feature / Hot Mortgage screens. */
export const DUMMY_FEATURED_MORTGAGE: MobileProduct = {
  ...base,
  id: "dummy-featured-mortgage",
  referenceNumber: "MRT-DEMO-1",
  name: "2 Bedroom Flat Duplex",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.",
  image: "/mortgage-feature.png",
  propertyValue: 122_000_000,
  duration: "12 months",
  interestRate: "3% p.a",
}

export const DUMMY_HOT_MORTGAGES: MobileProduct[] = [
  {
    ...base,
    id: "dummy-hot-mortgage-1",
    referenceNumber: "MRT-DEMO-2",
    name: "3 Bedroom Duplex",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    image: "/mortgage-hot-1.png",
    propertyValue: 98_500_000,
    duration: "12 months",
    interestRate: "3% p.a",
  },
  {
    ...base,
    id: "dummy-hot-mortgage-2",
    referenceNumber: "MRT-DEMO-3",
    name: "Modern Bungalow",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    image: "/mortgage-hot-2.png",
    propertyValue: 75_000_000,
    duration: "12 months",
    interestRate: "3% p.a",
  },
]

export function buildMortgageCatalogFromProducts(products: MobileProduct[]): {
  featured: MobileProduct
  hot: MobileProduct[]
} {
  if (products.length === 0) {
    return { featured: DUMMY_FEATURED_MORTGAGE, hot: DUMMY_HOT_MORTGAGES }
  }

  const [featured, ...rest] = products
  const hot = rest.length > 0 ? rest : DUMMY_HOT_MORTGAGES
  return { featured: featured ?? DUMMY_FEATURED_MORTGAGE, hot }
}
