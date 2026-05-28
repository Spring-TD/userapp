export interface MobileProduct {
  id: string
  upstreamProductId?: string
  referenceNumber: string
  name: string
  description: string
  type: "Loan" | "Mortgage" | "Savings" | "Commodity" | "Invest"
  subType?: string
  appId: string
  status: string
  isActive: boolean
  isFeatured: boolean
  image?: string
  interestRate?: string
  interestMethod?: string
  duration?: string
  repaymentFrequency?: string
  withdrawalFlexibility?: string
  amountMin?: number
  amountMax?: number
  equityContribution?: number
  propertyValue?: number
  price?: number
  minimumQuantity?: number
  unitOfMeasure?: string
  unitAmount?: number
  roi?: string
  termsAndCondition?: string
  fees?: ProductFee[]
  requirements?: ProductRequirement[]
  documentsToDownload?: ProductDocument[]
  properties?: ProductProperty[]
  createdAt: string
  updatedAt: string
}

export type StorefrontProductType = MobileProduct["type"]

export interface ProductFee {
  name: string
  feeType?: string
  value?: string
}

export interface ProductRequirement {
  requirementType?: string
  contentType?: string
  description?: string
  uploadRequired?: boolean
}

export interface ProductDocument {
  name: string
  fileUrl?: string
}

export interface ProductProperty {
  name?: string
  propertyType?: string
  value?: number
  location?: string
}

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.-]/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return undefined
}

function asRange(value: unknown): { min?: number; max?: number } {
  const row = asRecord(value)
  return {
    min: asNumber(row.min),
    max: asNumber(row.max),
  }
}

function firstNamedDescription(items: unknown): { name?: string; description?: string } | null {
  if (!Array.isArray(items)) return null
  const first = asRecord(items[0])
  const result = {
    name: asString(first.name),
    description: asString(first.description),
  }
  return result.name || result.description ? result : null
}

function mapFees(value: unknown): ProductFee[] {
  if (!Array.isArray(value)) return []
  return value
    .map((fee) => {
      const row = asRecord(fee)
      const name = asString(row.name)
      if (!name) return null
      return {
        name,
        feeType: asString(row.feeType ?? row.penaltyType),
        value: asString(row.value),
      }
    })
    .filter(Boolean) as ProductFee[]
}

function mapRequirements(value: unknown): ProductRequirement[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = asRecord(item)
    return {
      requirementType: asString(row.requirementType),
      contentType: asString(row.contentType),
      description: asString(row.description),
      uploadRequired: row.uploadRequired === true,
    }
  })
}

function mapDocuments(value: unknown): ProductDocument[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const row = asRecord(item)
      const name = asString(row.name)
      if (!name) return null
      return {
        name,
        fileUrl: asString(row.fileUrl),
      }
    })
    .filter(Boolean) as ProductDocument[]
}

function mapProperties(value: unknown): ProductProperty[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = asRecord(item)
    return {
      name: asString(row.name),
      propertyType: asString(row.propertyType),
      value: asNumber(row.value),
      location: asString(row.location),
    }
  })
}

function formatPercent(value: unknown): string | undefined {
  const text = asString(value)
  if (!text) return undefined
  return text.includes("%") ? text : `${text}%`
}

/** Map Product MS row → {@link MobileProduct} for mobile v2 UI. */
export function mapApiProductToMobileProduct(row: Record<string, unknown>): MobileProduct | null {
  const id = String(row.id ?? row._id ?? "").trim()
  if (!id) return null

  const uiType = normalizeStorefrontProductType(row.type ?? row.productType ?? row.category)
  if (!uiType) return null

  const subType =
    typeof row.subType === "string"
      ? row.subType
      : typeof row.subtype === "string"
        ? row.subtype
        : undefined

  const structure = asRecord(row.structure)
  const about = asRecord(row.about)
  const requirementsPayload = asRecord(row.requirements)
  const feesAndCharges = asRecord(row.feesAndCharges)
  const merchantFeeAdditions = asRecord(row.merchantFeeAdditions)

  const loanAmount = asRange(structure.loanAmount)
  const investmentAmount = asRange(structure.investmentAmount)
  const savingsAmount = asRange(structure.savingsAmount)
  const unitPrice =
    asNumber(structure.price) ??
    asNumber(row.price) ??
    asNumber(asRecord(structure.unitAmount).amount) ??
    asNumber(structure.unitAmount)
  const minimumQuantity =
    asNumber(row.minimumQuantity) ??
    asNumber(structure.minQuantityPurchase) ??
    asNumber(asRecord(structure.unitAmount).minQuantity)
  const commodityAmount = {
    min: unitPrice != null && minimumQuantity != null ? unitPrice * minimumQuantity : undefined,
    max: asNumber(structure.maxAmount),
  }
  const returnsOnInvestment = structure.returnsOnInvestment
  const unitAmount = asRecord(structure.unitAmount)

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
  const typeDetails =
    firstNamedDescription(about.loanTypes) ||
    firstNamedDescription(about.mortgageTypes) ||
    firstNamedDescription(about.savingsTypes) ||
    firstNamedDescription(about.investmentTypes) ||
    firstNamedDescription(about.commodityTypes) ||
    {}
  const amountRange =
    loanAmount.min != null || loanAmount.max != null
      ? loanAmount
      : investmentAmount.min != null || investmentAmount.max != null
        ? investmentAmount
        : savingsAmount.min != null || savingsAmount.max != null
          ? savingsAmount
          : commodityAmount
  const fees = mapFees(feesAndCharges.fees)
  const lateRepayment = asRecord(feesAndCharges.lateRepayment)
  const forcefulPenalties = mapFees(feesAndCharges.forcefulWithdrawalPenalties)
  const penalties = mapFees(lateRepayment.penalties)
  const merchantFees = mapFees(merchantFeeAdditions.fees)
  const merchantLateRepayment = asRecord(merchantFeeAdditions.lateRepayment)
  const merchantForcefulPenalties = mapFees(merchantFeeAdditions.forcefulWithdrawalPenalties)
  const merchantPenalties = mapFees(merchantLateRepayment.penalties)
  const allFees = [
    ...fees,
    ...forcefulPenalties,
    ...penalties,
    ...merchantFees,
    ...merchantForcefulPenalties,
    ...merchantPenalties,
  ]

  const mapped: MobileProduct = {
    id,
    upstreamProductId: asString(row.upstreamProductId),
    referenceNumber: String(row.referenceNumber ?? row.reference_number ?? ""),
    name: String(row.name ?? "Product"),
    description: String(row.description || typeDetails.description || ""),
    type: uiType,
    subType: subType || typeDetails.name,
    appId: String(row.appId ?? row.app_id ?? ""),
    status: String(row.status ?? ""),
    isActive: row.isActive === true,
    isFeatured: row.isFeatured === true,
    image: previewAssetUrl,
    interestRate,
    interestMethod: asString(structure.interestMethod ?? structure.yieldMethod),
    duration,
    repaymentFrequency: asString(structure.repaymentFrequency),
    withdrawalFlexibility: asString(structure.withdrawalFlexibility),
    amountMin: amountRange.min,
    amountMax: amountRange.max,
    price:
      unitPrice,
    unitOfMeasure:
      typeof structure.unitOfMeasure === "string"
        ? structure.unitOfMeasure
        : typeof row.unitOfMeasure === "string"
          ? row.unitOfMeasure
          : undefined,
    propertyValue:
      typeof structure.propertyValue === "number" ? structure.propertyValue : undefined,
    equityContribution:
      asNumber(row.equityContribution) ?? asNumber(structure.equityContribution),
    minimumQuantity:
      minimumQuantity,
    unitAmount: asNumber(unitAmount.amount ?? structure.unitAmount),
    roi: formatPercent(returnsOnInvestment),
    termsAndCondition:
      asString(structure.investmentTermsAndCondition) ??
      asString(structure.commodityTermsAndCondition),
    fees: allFees,
    requirements: mapRequirements(requirementsPayload.otherRequirements),
    documentsToDownload: mapDocuments(requirementsPayload.documentsToDownload),
    properties: mapProperties(row.properties),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
    ...(loanAmount.max != null ? { propertyValue: loanAmount.max } : {}),
    ...(investmentAmount.min != null && loanAmount.max == null
      ? { propertyValue: investmentAmount.min }
      : {}),
    ...(savingsAmount.min != null && loanAmount.max == null && investmentAmount.min == null
      ? { propertyValue: savingsAmount.min }
      : {}),
    ...(asNumber(row.propertyValue) != null ? { propertyValue: asNumber(row.propertyValue) } : {}),
  }

  return mapped
}

export function storefrontProductDetailHref(product: Pick<MobileProduct, "id" | "type" | "name">): string {
  const id = encodeURIComponent(product.id)
  switch (getDisplayProductType(product)) {
    case "Loan":
      return `/mobile-v2/products/loan/${id}`
    case "Mortgage":
      return `/mobile-v2/products/mortgage/${id}`
    case "Savings":
      return `/mobile-v2/products/savings/flex-naira?productId=${id}`
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
