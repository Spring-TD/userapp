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

/** Tab for list UI — e.g. API `LOAN` + name contains "Mortgage" → Mortgage tab. */
export function getDisplayProductType(product: Pick<MobileProduct, "type" | "name">): StorefrontProductType {
  if (product.type === "Loan" && /\bmortgage\b/i.test(product.name)) {
    return "Mortgage"
  }
  return product.type
}

export function productMatchesTab(
  product: Pick<MobileProduct, "type" | "name">,
  tab: StorefrontProductType,
): boolean {
  return getDisplayProductType(product) === tab
}

function formatAboutDuration(about: Record<string, unknown>): string | undefined {
  if (typeof about.duration === "string" && about.duration.trim()) {
    return about.duration.trim()
  }
  const tenure = about.tenure
  if (typeof tenure === "string" && tenure.trim()) return tenure.trim()
  if (tenure && typeof tenure === "object") {
    const t = tenure as { label?: string; value?: number; unit?: string; min?: number; max?: number }
    if (typeof t.label === "string" && t.label.trim()) return t.label.trim()
    if (t.min != null && t.max != null) return `${t.min}–${t.max} mo`
    if (t.value != null && t.unit) return `${t.value} ${t.unit}`
  }
  return undefined
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
  const investmentAmount = structure.investmentAmount as { min?: number; max?: number } | undefined
  const returnsOnInvestment = structure.returnsOnInvestment

  let interestRate: string | undefined
  if (structure.interestRate != null) {
    interestRate = String(structure.interestRate)
  } else if (returnsOnInvestment != null) {
    interestRate = `${returnsOnInvestment}%`
  }

  const previewAssetUrl =
    typeof about.previewAssetUrl === "string" && about.previewAssetUrl.trim()
      ? about.previewAssetUrl.trim()
      : typeof row.image === "string"
        ? row.image
        : undefined

  const duration = formatAboutDuration(about)

  const mapped: MobileProduct = {
    id,
    referenceNumber: String(row.referenceNumber ?? row.reference_number ?? ""),
    name: String(row.name ?? "Product"),
    description: String(row.description ?? ""),
    type: uiType,
    subType,
    appId: String(row.appId ?? row.app_id ?? ""),
    status: String(row.status ?? ""),
    isActive: row.isActive !== false,
    image: previewAssetUrl,
    interestRate,
    duration,
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
    ...(investmentAmount?.min != null && loanAmount?.max == null
      ? { propertyValue: investmentAmount.min }
      : {}),
  }

  return mapped
}

export function storefrontProductDetailHref(product: Pick<MobileProduct, "id" | "type">): string {
  const id = encodeURIComponent(product.id)
  switch (product.type) {
    case "Loan":
      return `/mobile-v2/products/loan/${id}`
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
