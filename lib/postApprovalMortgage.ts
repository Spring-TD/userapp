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

export type PostApprovalFulfillment = {
  status?: PostApprovalMortgageStatus
  updatedAt?: string
  currentWorkflowStepId?: string
  completedWorkflowSteps?: string[]
  bankDetails?: {
    merchantReference?: string
    accountNumber?: string
    bankName?: string
    amount?: number
    currency?: string
  }
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
  applicationId: string
  productName?: string
  postApprovalFulfillment?: PostApprovalFulfillment
  bankDetails?: PostApprovalFulfillment["bankDetails"]
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
  if (!paf || typeof paf !== "object") return null
  return paf as PostApprovalFulfillment
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
