export interface MobileProduct {
  id: string
  referenceNumber: string
  name: string
  description: string
  type: "Loan" | "Mortgage" | "Savings" | "Commodity" | "Invest"
  subType?: string
  appId: string
  status: string
  isActive: boolean
  image?: string
  interestRate?: string
  duration?: string
  equityContribution?: number
  propertyValue?: number
  price?: number
  minimumQuantity?: number
  unitOfMeasure?: string
  createdAt: string
  updatedAt: string
}

export type StorefrontProductType = MobileProduct["type"]

const TYPE_TO_UI: Record<string, StorefrontProductType> = {
  LOAN: "Loan",
  MORTGAGE: "Mortgage",
  SAVINGS: "Savings",
  COMMODITY: "Commodity",
  INVESTMENT: "Invest",
  INVEST: "Invest",
}

/** API `type` (often uppercase enum) → UI tab type. */
export function normalizeStorefrontProductType(raw: unknown): StorefrontProductType | null {
  if (raw == null) return null
  const key = String(raw).trim().toUpperCase()
  if (TYPE_TO_UI[key]) return TYPE_TO_UI[key]
  const title = String(raw).trim()
  const titleKey = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
  if (["Loan", "Mortgage", "Savings", "Commodity", "Invest"].includes(titleKey)) {
    return titleKey as StorefrontProductType
  }
  return null
}

export function filterActiveAppProducts<T extends { isActive?: boolean }>(rows: T[]): T[] {
  return rows.filter((p) => p.isActive === true)
}

/** Map Product MS row → {@link MobileProduct} for mobile v2 UI. */
export function mapApiProductToMobileProduct(row: Record<string, unknown>): MobileProduct | null {
  const id = String(row.id ?? row._id ?? "").trim()
  if (!id) return null

  const uiType = normalizeStorefrontProductType(row.type)
  if (!uiType) return null

  const subType =
    typeof row.subType === "string"
      ? row.subType
      : typeof row.subtype === "string"
        ? row.subtype
        : undefined

  const structure =
    row.structure && typeof row.structure === "object"
      ? (row.structure as Record<string, unknown>)
      : {}
  const about =
    row.about && typeof row.about === "object" ? (row.about as Record<string, unknown>) : {}

  const loanAmount = structure.loanAmount as { min?: number; max?: number } | undefined
  const interestRate = structure.interestRate

  return {
    id,
    referenceNumber: String(row.referenceNumber ?? row.reference_number ?? ""),
    name: String(row.name ?? "Product"),
    description: String(row.description ?? ""),
    type: uiType,
    subType,
    appId: String(row.appId ?? row.app_id ?? ""),
    status: String(row.status ?? ""),
    isActive: row.isActive !== false,
    interestRate: interestRate != null ? String(interestRate) : undefined,
    duration:
      about.tenure && typeof about.tenure === "object"
        ? `${(about.tenure as { min?: number }).min ?? ""}–${(about.tenure as { max?: number }).max ?? ""} mo`
        : undefined,
    price:
      typeof structure.price === "number"
        ? structure.price
        : typeof row.price === "number"
          ? row.price
          : undefined,
    unitOfMeasure:
      typeof structure.unitOfMeasure === "string"
        ? structure.unitOfMeasure
        : typeof row.unitOfMeasure === "string"
          ? row.unitOfMeasure
          : undefined,
    propertyValue:
      typeof structure.propertyValue === "number" ? structure.propertyValue : undefined,
    equityContribution:
      typeof structure.equityContribution === "number" ? structure.equityContribution : undefined,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
    ...(loanAmount?.max != null ? { propertyValue: loanAmount.max } : {}),
  }
}

export function storefrontProductDetailHref(product: Pick<MobileProduct, "id" | "type">): string {
  const id = encodeURIComponent(product.id)
  switch (product.type) {
    case "Loan":
      return `/mobile-v2/products/loan/apply?productId=${id}`
    case "Mortgage":
      return `/mobile-v2/products/mortgage/${id}`
    case "Savings":
      return `/mobile-v2/products/savings`
    case "Commodity":
      return `/mobile-v2/products/commodity/${id}`
    case "Invest":
      return `/mobile-v2/products/invest/${id}`
    default:
      return `/mobile-v2/products/loan`
  }
}

export function storefrontProductTypeRoute(type: StorefrontProductType): string {
  const routes: Record<StorefrontProductType, string> = {
    Loan: "/mobile-v2/products/loan",
    Mortgage: "/mobile-v2/products/mortgage",
    Savings: "/mobile-v2/products/savings",
    Commodity: "/mobile-v2/products/commodity",
    Invest: "/mobile-v2/products/invest",
  }
  return routes[type]
}
