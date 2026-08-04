/**
 * Post-approval mortgage fulfillment state (mirrors account-ms / product-ms).
 */

export type PostApprovalMortgageStatus =
  | "offer_pending"
  | "offer_accepted"
  | "appointment_scheduled"
  | "inspection_in_progress"
  | "down_payment_pending"
  | "down_payment_paid"
  | "down_payment_confirmed"
  | "contract_issued"
  | "contract_signed"
  | "disbursed"
  | "offer_declined"
  | "inspection_declined"

export type MortgageInspectionDateSlot = {
  scheduledFor: string
  label?: string
  location?: string
  notes?: string
}

/** Merchant REPAYMENT virtual account — not the borrower's Central Wallet NUBAN. */
export type MortgageEquityBankDetails = {
  merchantReference?: string
  accountNumber?: string
  bankName?: string
  bankCode?: string
  accountName?: string
  amount?: number
  currency?: string
}

export type MortgageDownPaymentInfo = {
  requiredAmount?: number
  currency?: string
  paidAt?: string
  channel?: string
  providerReference?: string
}

export type PostApprovalFulfillment = {
  status?: PostApprovalMortgageStatus
  updatedAt?: string
  currentWorkflowStepId?: string
  completedWorkflowSteps?: string[]
  virtualTourCompletedAt?: string
  virtualInspectionCompletedAt?: string
  downPayment?: MortgageDownPaymentInfo
  bankDetails?: MortgageEquityBankDetails
  contract?: {
    documentUrl?: string
    documentSource?: string
    documentFileName?: string
    uploadedAt?: string
    uploadedByMerchantId?: string
    issuedAt?: string
  }
  offer?: {
    sentAt?: string
    acceptedAt?: string
  }
  appointment?: {
    scheduledAt?: string
    scheduledFor?: string
    location?: string
    notes?: string
  }
  /** Merchant-configured slots snapshotted / refreshed from the product. */
  availableInspectionDates?: MortgageInspectionDateSlot[]
}

export type PendingApprovedMortgageDetail = {
  applicationId?: string
  id?: string
  productName?: string
  productType?: string
  loanWorkflowStatus?: string
  application?: {
    id?: string
    productType?: string
    loanWorkflowStatus?: string
    postApprovalFulfillment?: PostApprovalFulfillment
  }
  postApprovalFulfillment?: PostApprovalFulfillment
  bankDetails?: MortgageEquityBankDetails
  /** Prefer `requiredAmount` from the clarified contract. */
  requiredAmount?: number
  currency?: string
  centralWalletAvailable?: boolean
  /** @deprecated Prefer requiredAmount */
  equityAmount?: number
  propertyValue?: number
  availableInspectionDates?: MortgageInspectionDateSlot[]
  offerLetter?: {
    html?: string
    text?: string
    reference?: string
    offerValidUntil?: string
    pdfUrl?: string
    pdfFileName?: string
    signedPdfUrl?: string
    signedPdfFileName?: string
  }
}

export function extractPostApprovalFulfillment(raw: Record<string, unknown>): PostApprovalFulfillment | null {
  const paf = raw.postApprovalFulfillment
  if (paf && typeof paf === "object") return paf as PostApprovalFulfillment
  const application = raw.application
  if (application && typeof application === "object") {
    const nested = (application as Record<string, unknown>).postApprovalFulfillment
    if (nested && typeof nested === "object") return nested as PostApprovalFulfillment
  }
  return null
}

export function extractAvailableInspectionDates(
  detail: PendingApprovedMortgageDetail | Record<string, unknown> | null | undefined,
): MortgageInspectionDateSlot[] {
  if (!detail || typeof detail !== "object") return []
  const record = detail as Record<string, unknown>
  const paf = extractPostApprovalFulfillment(record)
  const fromPaf = paf?.availableInspectionDates
  const topLevel = record.availableInspectionDates
  const raw = Array.isArray(fromPaf) ? fromPaf : Array.isArray(topLevel) ? topLevel : []
  const now = Date.now()
  const slots: MortgageInspectionDateSlot[] = []
  for (const slot of raw) {
    if (!slot || typeof slot !== "object") continue
    const row = slot as Record<string, unknown>
    const scheduledFor = String(row.scheduledFor ?? "").trim()
    if (!scheduledFor) continue
    const when = new Date(scheduledFor)
    if (Number.isNaN(when.getTime()) || when.getTime() < now - 60_000) continue
    slots.push({
      scheduledFor,
      label: String(row.label ?? "").trim() || undefined,
      location: String(row.location ?? "").trim() || undefined,
      notes: String(row.notes ?? "").trim() || undefined,
    })
  }
  return slots.sort(
    (a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  )
}

export function mortgageFulfillmentStatus(
  detail: PendingApprovedMortgageDetail | null | undefined,
): PostApprovalMortgageStatus | undefined {
  if (!detail) return undefined
  return (
    detail.postApprovalFulfillment?.status ||
    detail.application?.postApprovalFulfillment?.status
  )
}

/** Required equity amount from pending-approved-mortgage detail. */
export function mortgageDownPaymentDue(
  detail: PendingApprovedMortgageDetail | null | undefined,
): number {
  if (!detail) return 0
  const candidates = [
    detail.requiredAmount,
    detail.postApprovalFulfillment?.downPayment?.requiredAmount,
    detail.application?.postApprovalFulfillment?.downPayment?.requiredAmount,
    detail.equityAmount,
    detail.bankDetails?.amount,
    detail.postApprovalFulfillment?.bankDetails?.amount,
  ]
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value
  }
  return 0
}

export function mortgageEquityBankDetails(
  detail: PendingApprovedMortgageDetail | null | undefined,
): MortgageEquityBankDetails | null {
  if (!detail) return null
  const merged: MortgageEquityBankDetails = {
    ...detail.postApprovalFulfillment?.bankDetails,
    ...detail.application?.postApprovalFulfillment?.bankDetails,
    ...detail.bankDetails,
  }
  if (
    !merged.merchantReference &&
    !merged.accountNumber &&
    !merged.bankName &&
    !merged.accountName
  ) {
    return null
  }
  return merged
}

export function isMortgageDownPaymentPending(
  detail: PendingApprovedMortgageDetail | Record<string, unknown> | null | undefined,
): boolean {
  if (!detail || typeof detail !== "object") return false
  const status = mortgageFulfillmentStatus(detail as PendingApprovedMortgageDetail)
  if (status) return status === "down_payment_pending"
  const paf = extractPostApprovalFulfillment(detail as Record<string, unknown>)
  return paf?.status === "down_payment_pending"
}

export function isMortgageDownPaymentPaidOrLater(status?: PostApprovalMortgageStatus | string | null): boolean {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  return (
    normalized === "down_payment_paid" ||
    normalized === "down_payment_confirmed" ||
    normalized === "contract_issued" ||
    normalized === "contract_signed" ||
    normalized === "disbursed"
  )
}

export function postApprovalStepToOfferFlowStep(
  status?: PostApprovalMortgageStatus,
): "schedule_inspection" | "inspection" | "down_payment" | "contract" | null {
  switch (status) {
    case "offer_accepted":
      return "schedule_inspection"
    case "appointment_scheduled":
    case "inspection_in_progress":
      return "inspection"
    case "down_payment_pending":
    case "down_payment_paid":
      return "down_payment"
    case "down_payment_confirmed":
    case "contract_issued":
    case "contract_signed":
      return "contract"
    default:
      return null
  }
}
