import { ENDPOINTS } from "@/lib/endpoints"
import { extractDetailRow, fetchMobileProductById } from "@/lib/fetchMobileProductById"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { TENANT_APP_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"
import { buildProductApplyBody } from "@/lib/productApplyPayload"
import type { PlatformFields } from "@/lib/platformApplicationFields"
import {
  attachPlatformFieldsToApplyBody,
  baselinePlatformFieldsForEnrollment,
} from "@/lib/platformApplicationFields"
import { resolveWalletUserId } from "@/lib/resolveWalletUserId"
import { sanitizeProductId } from "@/lib/sanitizeProductId"
import { invalidateStorefrontApplications, invalidateStorefrontWallet } from "@/lib/storefrontSessionData"
import type { ProductApplication } from "@/types/productApplication"

const BFF = "/api"

function bffUrl(path: string): string {
  return `${BFF}${path.startsWith("/") ? path : `/${path}`}`
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  error?: string
  data?: T
}

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const row = data as ApiEnvelope<unknown>
    if (row.error) return row.error
    if (row.message) return row.message
  }
  return status === 402 ? "Insufficient balance in wallet" : `Request failed (${status})`
}

export type CommodityPricing = {
  productId: string
  productName?: string
  productType?: string
  price?: number
  currency?: string
  springTDFee?: number | null
  serviceFee?: number | null
  markupRate?: number | null
}

export type CommodityPurchaseAccount = {
  id?: string
  applicationId?: string
  principal?: number
  interestRatePercent?: number
  expectedInterest?: number
  totalAtMaturity?: number
  currency?: string
  status?: string
  holdingStatus?: string
  productId?: string
  productName?: string
  maturityAt?: string
  fundedAt?: string
  purchase?: {
    referenceId?: string
    basePrice?: number
    commissionAmount?: number
    totalAmount?: number
    commissionRatePercent?: number
  }
  commoditySelection?: {
    unitPrice?: number
    quantity?: number
    total?: number
    unitOfMeasure?: string
  }
}

export type CommodityApplyResult = {
  type?: string
  applicationId?: string
  account?: CommodityPurchaseAccount
}

export type CommodityPurchaseTotals = {
  unitPrice: number
  minQuantity: number
  principal: number
  commission: number
  totalDebit: number
  commissionRatePercent: number
}

export type CommodityPurchaseContext = CommodityPurchaseTotals & {
  walletBalance: number
  holdingBalance: number
  canPurchase: boolean
  pricing: CommodityPricing | null
}

/** Matches server unit price resolution. */
export function resolveCommodityUnitPrice(product: {
  price?: number | null
  unitAmount?: number | null
  structure?: unknown
}): number {
  const structure =
    product.structure && typeof product.structure === "object"
      ? (product.structure as Record<string, unknown>)
      : {}
  const unitAmount = structure.unitAmount
  if (unitAmount && typeof unitAmount === "object") {
    const amount = Number((unitAmount as { amount?: unknown }).amount)
    if (Number.isFinite(amount) && amount > 0) return amount
  }
  if (unitAmount != null) {
    const n = Number(unitAmount)
    if (Number.isFinite(n) && n > 0) return n
  }
  if (typeof product.unitAmount === "number" && product.unitAmount > 0) return product.unitAmount
  if (typeof product.price === "number" && product.price > 0) return product.price
  const structurePrice = Number(structure.price)
  if (Number.isFinite(structurePrice) && structurePrice > 0) return structurePrice
  return 1
}

export function resolveCommodityMinQuantity(product: {
  minimumQuantity?: number | null
  structure?: unknown
}): number {
  const structure =
    product.structure && typeof product.structure === "object"
      ? (product.structure as Record<string, unknown>)
      : {}
  const fromStructure = Number(structure.minQuantityPurchase)
  if (Number.isFinite(fromStructure) && fromStructure > 0) return Math.floor(fromStructure)
  if (typeof product.minimumQuantity === "number" && product.minimumQuantity > 0) {
    return Math.floor(product.minimumQuantity)
  }
  return 1
}

export function resolveCommissionRatePercent(pricing: CommodityPricing | null | undefined): number {
  const rate = pricing?.springTDFee ?? pricing?.serviceFee ?? 1
  return typeof rate === "number" && Number.isFinite(rate) ? rate : 1
}

export function computeCommodityTotals(
  unitPrice: number,
  quantity: number,
  ratePercent: number,
): CommodityPurchaseTotals {
  const principal = Math.round(unitPrice * quantity * 100) / 100
  const commission = Math.round(principal * (ratePercent / 100) * 100) / 100
  const totalDebit = Math.round((principal + commission) * 100) / 100
  return {
    unitPrice,
    minQuantity: 1,
    principal,
    commission,
    totalDebit,
    commissionRatePercent: ratePercent,
  }
}

export function formatMoratoriumLabel(structure?: Record<string, unknown> | null): string | null {
  if (!structure) return null
  const moratorium = structure.moratorium
  if (!moratorium || typeof moratorium !== "object") return null
  const value = Number((moratorium as { value?: unknown }).value)
  const unit = String((moratorium as { unit?: unknown }).unit || "month")
  if (!Number.isFinite(value) || value <= 0) return null
  const unitLabel = value === 1 ? unit.replace(/s$/, "") : unit
  return `${value} ${unitLabel}`
}

export function formatOfferYieldLabel(structure?: Record<string, unknown> | null): string | null {
  if (!structure?.offerYieldEnabled) return null
  const yieldValue = Number(structure.offerYield)
  if (!Number.isFinite(yieldValue)) return null
  return `${yieldValue}%`
}

type CommodityHoldingRow = ProductApplication & {
  contractSnapshot?: {
    commodityPrincipal?: number
    commodityHoldingStatus?: string
    maturityAt?: string
    expectedInterest?: number
    offerYieldPercent?: number
    commoditySelection?: { quantity?: number; unitPrice?: number; total?: number }
  }
  amount?: number
}

export function aggregateCommodityHoldingBalance(
  applications: CommodityHoldingRow[],
  productId?: string,
): number {
  const active = applications.filter((row) => {
    if (productId && row.productId !== productId) return false
    return row.contractSnapshot?.commodityHoldingStatus !== "WITHDRAWN"
  })

  return active.reduce((sum, row) => {
    const principal = Number(
      row.contractSnapshot?.commodityPrincipal ?? row.amount ?? 0,
    )
    return sum + (Number.isFinite(principal) ? principal : 0)
  }, 0)
}

export async function fetchCommodityPricing(productId: string): Promise<{
  pricing: CommodityPricing | null
  error: string | null
}> {
  const id = sanitizeProductId(productId)
  if (!id) return { pricing: null, error: "Invalid product" }

  const res = await fetchWithAuth(bffUrl(ENDPOINTS.pricing.product(id)), { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope<CommodityPricing>
  if (!res.ok) {
    return { pricing: null, error: parseApiError(data, res.status) }
  }
  return { pricing: data.data ?? null, error: null }
}

export async function fetchCommodityHoldings(
  userId: string,
  appId: string,
  productId?: string,
): Promise<{ applications: CommodityHoldingRow[]; error: string | null }> {
  const qs = new URLSearchParams({ productType: "COMMODITY", appId })
  const res = await fetchWithAuth(
    bffUrl(`${ENDPOINTS.applications.user(userId)}?${qs}`),
    { method: "GET" },
  )
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope<CommodityHoldingRow[]>
  if (!res.ok) {
    return { applications: [], error: parseApiError(data, res.status) }
  }
  const list = Array.isArray(data.data) ? data.data : []
  if (!productId) return { applications: list, error: null }
  return {
    applications: list.filter((row) => row.productId === productId),
    error: null,
  }
}

export async function loadCommodityPurchaseContext(params: {
  userId: string
  appId: string
  productId: string
  product: {
    price?: number | null
    unitAmount?: number | null
    minimumQuantity?: number | null
    structure?: unknown
  }
  quantity: number
  walletBalance: number
}): Promise<CommodityPurchaseContext & { error: string | null }> {
  const unitPrice = resolveCommodityUnitPrice(params.product)
  const minQuantity = resolveCommodityMinQuantity(params.product)
  const qty = Math.max(minQuantity, params.quantity)

  const [pricingResult, holdingsResult] = await Promise.all([
    fetchCommodityPricing(params.productId),
    fetchCommodityHoldings(params.userId, params.appId, params.productId),
  ])

  const ratePercent = resolveCommissionRatePercent(pricingResult.pricing)
  const totals = computeCommodityTotals(unitPrice, qty, ratePercent)
  totals.minQuantity = minQuantity

  const holdingBalance = aggregateCommodityHoldingBalance(
    holdingsResult.applications,
    params.productId,
  )

  return {
    ...totals,
    walletBalance: params.walletBalance,
    holdingBalance,
    canPurchase: params.walletBalance >= totals.totalDebit,
    pricing: pricingResult.pricing,
    error: pricingResult.error || holdingsResult.error,
  }
}

export async function buildCommodityApplyBody(
  productId: string,
  quantity: number,
  options?: { requirementSubmissions?: unknown[]; platformFields?: PlatformFields },
) {
  const built = await buildProductApplyBody(productId, {
    productType: "COMMODITY",
    currency: "NGN",
  })
  if (!built.ok) return built

  const appId =
    typeof window !== "undefined"
      ? sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() || undefined
      : undefined

  let minQty = 1
  try {
    const [product, meta] = await Promise.all([
      fetchMobileProductById(productId),
      fetchCommodityProductMeta(productId),
    ])
    minQty = resolveCommodityMinQuantity({
      minimumQuantity: product?.minimumQuantity,
      structure: meta.structure,
    })
  } catch {
    /* use default */
  }

  const qty = Math.max(minQty, Math.floor(quantity))
  const pep = options?.platformFields?.isPoliticallyExposedPerson

  // Match STOREFRONT_ALL_PRODUCTS commodity contract (no productType / amount).
  const {
    userId,
    productId: pid,
    currency,
    email,
    merchantId,
    applicantName,
    phone,
    bvn,
    country,
    appId: bodyAppId,
  } = built.body

  const body: Record<string, unknown> = {
    userId,
    productId: pid,
    currency: currency || "NGN",
    quantity: qty,
    ...(email ? { email } : {}),
    ...(applicantName ? { applicantName } : {}),
    ...(phone ? { phone } : {}),
    ...(bvn ? { bvn } : {}),
    ...(merchantId ? { merchantId } : {}),
    ...(country ? { country } : {}),
    ...(appId || bodyAppId ? { appId: appId || bodyAppId } : {}),
    ...(options?.requirementSubmissions?.length
      ? { requirementSubmissions: options.requirementSubmissions }
      : {}),
  }

  if (typeof pep !== "boolean") {
    return { ok: true as const, body }
  }

  return {
    ok: true as const,
    body: attachPlatformFieldsToApplyBody(
      body,
      baselinePlatformFieldsForEnrollment(pep, options?.platformFields),
    ),
  }
}

export async function purchaseCommodity(
  productId: string,
  quantity: number,
  options?: { requirementSubmissions?: unknown[]; platformFields?: PlatformFields },
): Promise<
  | { ok: true; data: CommodityApplyResult }
  | { ok: false; error: string; status?: number }
> {
  if (options?.platformFields?.isPoliticallyExposedPerson === undefined) {
    return {
      ok: false,
      error: 'Please indicate whether you are a politically exposed person.',
    }
  }

  const built = await buildCommodityApplyBody(productId, quantity, options)
  if (!built.ok) return { ok: false, error: built.error }

  const res = await fetchWithAuth(bffUrl(ENDPOINTS.commodityAccounts.apply), {
    method: "POST",
    body: JSON.stringify(built.body),
  })
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope<CommodityApplyResult>
  if (!res.ok || data.success === false) {
    return {
      ok: false,
      error: parseApiError(data, res.status),
      status: res.status,
    }
  }

  invalidateStorefrontWallet()
  invalidateStorefrontApplications()

  return { ok: true, data: data.data ?? {} }
}

export async function getCommodityAccount(
  applicationId: string,
  userId: string,
): Promise<{ account: CommodityPurchaseAccount | null; error: string | null }> {
  const qs = new URLSearchParams({ userId })
  const res = await fetchWithAuth(
    bffUrl(`${ENDPOINTS.commodityAccounts.byId(applicationId)}?${qs}`),
    { method: "GET" },
  )
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope<CommodityPurchaseAccount>
  if (!res.ok) {
    return { account: null, error: parseApiError(data, res.status) }
  }
  return { account: data.data ?? null, error: null }
}

export async function withdrawCommodity(
  applicationId: string,
  userId?: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const resolvedUserId = userId || (await resolveWalletUserId())
  if (!resolvedUserId) return { ok: false, error: "Sign in to continue." }

  const res = await fetchWithAuth(
    bffUrl(ENDPOINTS.commodityAccounts.withdraw(applicationId)),
    {
      method: "POST",
      body: JSON.stringify({ userId: resolvedUserId }),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok || (data as ApiEnvelope<unknown>).success === false) {
    return { ok: false, error: parseApiError(data, res.status) }
  }
  invalidateStorefrontWallet(resolvedUserId)
  invalidateStorefrontApplications(resolvedUserId)
  return { ok: true, data: (data as ApiEnvelope<unknown>).data }
}

export function canWithdrawCommodity(holding: {
  holdingStatus?: string
  status?: string
  maturityAt?: string
}): boolean {
  const status = String(holding.holdingStatus || holding.status || "").toUpperCase()
  if (status === "WITHDRAWN") return false
  if (!holding.maturityAt) return false
  return new Date() >= new Date(holding.maturityAt)
}

export type CommodityProductMeta = {
  structure: Record<string, unknown> | null
  merchantName: string | null
  moratoriumLabel: string | null
  offerYieldLabel: string | null
}

export async function fetchCommodityProductMeta(productId: string): Promise<CommodityProductMeta> {
  const id = sanitizeProductId(productId)
  if (!id) {
    return { structure: null, merchantName: null, moratoriumLabel: null, offerYieldLabel: null }
  }

  const res = await fetchWithAuth(bffUrl(ENDPOINTS.products.byId(id)), { method: "GET" })
  const json = await res.json().catch(() => ({}))
  const row = extractDetailRow(json, id)
  const structure =
    row?.structure && typeof row.structure === "object"
      ? (row.structure as Record<string, unknown>)
      : null
  const merchant =
    row?.merchant && typeof row.merchant === "object"
      ? (row.merchant as Record<string, unknown>)
      : null
  const merchantName =
    (typeof merchant?.companyName === "string" && merchant.companyName) ||
    (typeof merchant?.name === "string" && merchant.name) ||
    null

  return {
    structure,
    merchantName,
    moratoriumLabel: formatMoratoriumLabel(structure),
    offerYieldLabel: formatOfferYieldLabel(structure),
  }
}
