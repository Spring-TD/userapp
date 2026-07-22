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

export type PostApprovalFulfillment = {
  status?: PostApprovalMortgageStatus
  updatedAt?: string
  currentWorkflowStepId?: string
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
}

export function extractPostApprovalFulfillment(raw: Record<string, unknown>): PostApprovalFulfillment | null {
  const paf = raw.postApprovalFulfillment
  if (!paf || typeof paf !== "object") return null
  return paf as PostApprovalFulfillment
}

export type PendingApprovedMortgageDetail = {
  applicationId: string
  productName?: string
  postApprovalFulfillment?: PostApprovalFulfillment
  bankDetails?: PostApprovalFulfillment["bankDetails"]
  equityAmount?: number
  propertyValue?: number
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

export function postApprovalStepToOfferFlowStep(
  status?: PostApprovalMortgageStatus,
): "schedule_inspection" | "inspection" | "down_payment" | "contract" | null {
  switch (status) {
    case "offer_accepted":
    case "appointment_scheduled":
      return "schedule_inspection"
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
