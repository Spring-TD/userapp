import {
  mergeCollateralRequirements,
  type SecurityCollateralRequirement,
} from "@/lib/securityRequirementOptions"

export interface MobileProduct {
  id: string
  upstreamProductId?: string
  merchantId?: string
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
  /** fixed_amount | percentage_based | zero_down (and label variants). */
  equityRequirement?: string
  equityContribution?: number
  /** MORTGAGE facility base (`structure.mortgageAmount`). */
  mortgageAmount?: number
  /** From `calculatedConfig.mortgage` when present. */
  estimatedDownPayment?: number
  estimatedFinancedAmount?: number
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
  propertyDescription?: string
  videoUrl?: string
  imageUrls?: string[]
  /** Declared title-doc types only (no file URLs). */
  propertyDocumentation?: { documentType: string }[]
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

/**
 * Swagger list items are `{ id, isActive, merchant, type, ... }` with no `upstreamProductId`.
 * Clones may also include `upstreamProductId`; either shape is purchasable when active.
 */
export function isStorefrontPurchasableProduct(
  product: Pick<MobileProduct, "id" | "upstreamProductId" | "isActive">,
): boolean {
  const localId = String(product.id ?? "").trim()
  if (!localId) return false
  return product.isActive === true
}

export function filterActiveAppProducts<T extends Pick<MobileProduct, "id" | "upstreamProductId" | "isActive">>(
  rows: T[],
): T[] {
  return rows.filter((p) => isStorefrontPurchasableProduct(p))
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

export const STOREFRONT_PRODUCT_TYPE_ORDER: StorefrontProductType[] = [
  "Mortgage",
  "Loan",
  "Savings",
  "Invest",
  "Commodity",
]

/** Tabs / quick actions to show — only types that have at least one active product. */
export function availableStorefrontProductTypes(
  products: Pick<MobileProduct, "type" | "name">[],
): StorefrontProductType[] {
  const present = new Set(products.map((p) => getDisplayProductType(p)))
  return STOREFRONT_PRODUCT_TYPE_ORDER.filter((type) => present.has(type))
}

function formatLabeledDuration(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (!value || typeof value !== "object") return undefined
  const t = value as { label?: string; value?: number; unit?: string; min?: number; max?: number }
  if (typeof t.label === "string" && t.label.trim()) return t.label.trim()
  if (t.min != null && t.max != null) return `${t.min}–${t.max} mo`
  if (t.value != null && t.unit) return `${t.value} ${t.unit}`
  if (t.value != null) return String(t.value)
  return undefined
}

function formatAboutDuration(about: Record<string, unknown>): string | undefined {
  return formatLabeledDuration(about.duration) || formatLabeledDuration(about.tenure)
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
    const imageUrls = collectPropertyImageUrls(row)
    const propertyDocumentation = Array.isArray(row.propertyDocumentation)
      ? row.propertyDocumentation
          .map((doc) => {
            const docRow = asRecord(doc)
            const documentType = asString(docRow.documentType)
            return documentType ? { documentType } : null
          })
          .filter(Boolean) as { documentType: string }[]
      : []
    return {
      name: asString(row.name),
      propertyType: asString(row.propertyType ?? row.type),
      value: asNumber(row.value),
      location: asString(row.location),
      propertyDescription: asString(row.propertyDescription ?? row.description),
      videoUrl: asString(row.videoUrl),
      ...(imageUrls.length ? { imageUrls } : {}),
      ...(propertyDocumentation.length ? { propertyDocumentation } : {}),
    }
  })
}

function mediaUrlFromUnknown(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim()
  const rec = asRecord(value)
  const nested =
    rec.url ?? rec.fileUrl ?? rec.src ?? rec.previewUrl ?? rec.imageUrl ?? rec.previewAssetUrl
  if (typeof nested === "string" && nested.trim()) return nested.trim()
  return undefined
}

function collectPropertyImageUrls(row: Record<string, unknown>): string[] {
  const urls: string[] = []
  const push = (value: unknown) => {
    const url = mediaUrlFromUnknown(value)
    if (url) urls.push(url)
  }

  if (Array.isArray(row.imageUrls)) {
    for (const entry of row.imageUrls) push(entry)
  }

  if (Array.isArray(row.previewImages)) {
    for (const entry of row.previewImages) push(entry)
  }

  if (Array.isArray(row.images)) {
    for (const entry of row.images) push(entry)
  }

  push(row.previewImage)
  push(row.imageUrl ?? row.image)

  return Array.from(new Set(urls))
}

function collectProductHeroImage(
  row: Record<string, unknown>,
  about: Record<string, unknown>,
  properties: ProductProperty[],
): string | undefined {
  return (
    mediaUrlFromUnknown(about.previewAssetUrl) ||
    mediaUrlFromUnknown(about.previewImage) ||
    mediaUrlFromUnknown(row.previewAssetUrl) ||
    mediaUrlFromUnknown(row.previewImage) ||
    mediaUrlFromUnknown(row.image) ||
    mediaUrlFromUnknown(row.imageUrl) ||
    properties.find((p) => p.imageUrls?.[0])?.imageUrls?.[0]
  )
}

/**
 * Resolve catalog/API product card image from Plata/Spring product payloads.
 * Prefers `about.previewAssetUrl`, then top-level image fields, then property imageUrls.
 */
export function resolveCatalogProductImageUrl(row: unknown): string | undefined {
  if (!row || typeof row !== 'object') return undefined
  const rec = row as Record<string, unknown>
  const about =
    rec.about && typeof rec.about === 'object' ? (rec.about as Record<string, unknown>) : {}
  const properties: ProductProperty[] = Array.isArray(rec.properties)
    ? (rec.properties as Record<string, unknown>[]).map((p) => ({
        imageUrls: collectPropertyImageUrls(p),
      }))
    : []
  return collectProductHeroImage(rec, about, properties)
}

/** Backend product/property image only — never a stock/dummy fallback. */
export function resolveProductDisplayImage(
  product: Pick<MobileProduct, "image" | "properties"> | null | undefined,
): string | undefined {
  const fromProduct = product?.image?.trim()
  if (fromProduct) return fromProduct
  return product?.properties?.find((p) => p.imageUrls?.[0]?.trim())?.imageUrls?.[0]?.trim()
}

export function productImageBackgroundStyle(
  url?: string | null,
): { backgroundImage: string; backgroundSize: "cover"; backgroundPosition: "center" } | undefined {
  const src = String(url || "").trim()
  if (!src) return undefined
  return {
    backgroundImage: `url(${JSON.stringify(src)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }
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
  const calculatedConfig = asRecord(row.calculatedConfig)
  const calculatedBasis = asRecord(calculatedConfig.basis)
  const calculatedCommodity = asRecord(calculatedConfig.commodity)
  const calculatedMortgage = asRecord(calculatedConfig.mortgage)

  const loanAmount = asRange(structure.loanAmount)
  const mortgageFacility =
    asNumber(structure.mortgageAmount) ?? asNumber(calculatedMortgage.mortgageAmount)
  const estimatedDownPayment = asNumber(calculatedMortgage.estimatedDownPayment)
  const estimatedFinancedAmount = asNumber(calculatedMortgage.estimatedFinancedAmount)
  const investmentAmount = asRange(structure.investmentAmount)
  const savingsAmount = asRange(structure.savingsAmount)
  const unitPrice =
    asNumber(row.price) ??
    asNumber(structure.price) ??
    asNumber(calculatedCommodity.unitPrice) ??
    asNumber(asRecord(structure.unitAmount).amount) ??
    asNumber(structure.unitAmount)
  const minimumQuantity =
    asNumber(row.minimumQuantity) ??
    asNumber(structure.minQuantityPurchase) ??
    asNumber(calculatedCommodity.minimumQuantity) ??
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
  } else if (structure.offerYield != null) {
    interestRate = formatPercent(structure.offerYield)
  } else if (calculatedCommodity.offerYieldPercent != null) {
    interestRate = formatPercent(calculatedCommodity.offerYieldPercent)
  } else if (calculatedBasis.annualRatePercent != null) {
    interestRate = formatPercent(calculatedBasis.annualRatePercent)
  } else if (returnsOnInvestment != null) {
    interestRate = `${returnsOnInvestment}%`
  }

  const mappedProperties = mapProperties(
    row.properties ?? asRecord(row.calculatedConfig).properties ?? asRecord(row.config).properties,
  )
  const previewAssetUrl = collectProductHeroImage(row, about, mappedProperties)

  const duration = formatAboutDuration(about)
  const typeDetails =
    firstNamedDescription(about.loanTypes) ||
    firstNamedDescription(about.mortgageTypes) ||
    firstNamedDescription(about.savingsTypes) ||
    firstNamedDescription(about.investmentTypes) ||
    firstNamedDescription(about.commodityTypes) ||
    {}
  const amountRange =
    mortgageFacility != null
      ? { min: mortgageFacility, max: mortgageFacility }
      : loanAmount.min != null || loanAmount.max != null
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
    upstreamProductId: asString(row.upstreamProductId ?? row.upstream_product_id),
    merchantId:
      asString(asRecord(row.merchant).id) ??
      asString(row.merchantId) ??
      asString(row.merchant_id),
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
      asNumber(row.propertyValue) ??
      asNumber(calculatedMortgage.propertyValue) ??
      asNumber(structure.propertyValue) ??
      mappedProperties.find((p) => p.value != null)?.value ??
      undefined,
    equityRequirement:
      asString(row.equityRequirement) ?? asString(structure.equityRequirement),
    equityContribution:
      asNumber(row.equityContribution) ?? asNumber(structure.equityContribution),
    mortgageAmount: mortgageFacility,
    estimatedDownPayment,
    estimatedFinancedAmount,
    minimumQuantity:
      minimumQuantity,
    unitAmount: asNumber(unitAmount.amount ?? structure.unitAmount),
    roi: formatPercent(returnsOnInvestment),
    termsAndCondition:
      asString(structure.investmentTermsAndCondition) ??
      asString(structure.commodityTermsAndCondition) ??
      asString(structure.savingsTermsAndCondition),
    fees: allFees,
    requirements: mapRequirements(
      mergeCollateralRequirements(
        asRecord(requirementsPayload.security),
        Array.isArray(requirementsPayload.otherRequirements)
          ? (requirementsPayload.otherRequirements as SecurityCollateralRequirement[])
          : [],
        {
          otherSpecification: asString(asRecord(row.metadata).securityOtherSpecification),
          securitySelection: asRecord(asRecord(row.metadata).securitySelection),
        },
      ),
    ),
    documentsToDownload: mapDocuments(requirementsPayload.documentsToDownload),
    properties: mappedProperties,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
    // Only fall back to loan/investment/savings ranges when no real property value exists.
    // Never overwrite mortgage propertyValue with loanAmount.max (that forced fake 10% → ₦500k).
    ...((() => {
      const hasPropertyValue =
        asNumber(structure.propertyValue) != null ||
        mappedProperties.some((p) => p.value != null) ||
        asNumber(row.propertyValue) != null
      if (hasPropertyValue) {
        return asNumber(row.propertyValue) != null
          ? { propertyValue: asNumber(row.propertyValue) }
          : {}
      }
      if (loanAmount.max != null) return { propertyValue: loanAmount.max }
      if (investmentAmount.min != null) return { propertyValue: investmentAmount.min }
      if (savingsAmount.min != null) return { propertyValue: savingsAmount.min }
      return {}
    })()),
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
