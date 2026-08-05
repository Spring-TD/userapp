import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { syncMortgageWorkflowPatchToApi } from '@/lib/mortgageWorkflowApi'
import {
  extractPostApprovalFulfillment,
  isVirtualInspectionComplete,
  normalizeWorkflowStepId,
  type PostApprovalFulfillment,
  type PostApprovalMortgageStatus,
} from '@/lib/postApprovalMortgage'

/** 8-step mortgage workflow aligned with Spring merchant spec. */
export type MortgageWorkflowStep =
  | 'application_submission'
  | 'virtual_tour'
  | 'offer_letter'
  | 'book_inspection'
  | 'accept_offer'
  | 'down_payment'
  | 'contract_signing'
  | 'mortgage_allocation'
  | 'declined'

export type MortgageDownPaymentMethod = 'savings_plan' | 'equity_contribution'

export type MortgageWorkflowLocalState = {
  applicationId: string
  productId: string
  downPaymentMethod?: MortgageDownPaymentMethod
  virtualTourCompleted?: boolean
  offerLetterDownloaded?: boolean
  inspectionScheduled?: boolean
  offerAccepted?: boolean
  offerDeclined?: boolean
  /** Applicant cancelled during virtual tour / opt-out. */
  cancelled?: boolean
  cancelReason?: string
  signedOfferUploaded?: boolean
  /** @deprecated Legacy workflow flag */
  inspectionCompleted?: boolean
  downPaymentConfirmed?: boolean
  contractAccepted?: boolean
  allocationDownloaded?: boolean
  updatedAt: string
}

const STORAGE_KEY = 'mobile_v2_mortgage_workflow_v1'

function readAll(): Record<string, MortgageWorkflowLocalState> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, MortgageWorkflowLocalState>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, MortgageWorkflowLocalState>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function applicationKey(application: StorefrontApplication): string {
  return String(application.id ?? application._id ?? '').trim()
}

export function readMortgageWorkflow(applicationId: string): MortgageWorkflowLocalState | null {
  if (!applicationId) return null
  return readAll()[applicationId] ?? null
}

export function saveMortgageWorkflow(state: MortgageWorkflowLocalState) {
  if (!state.applicationId) return
  const all = readAll()
  all[state.applicationId] = { ...state, updatedAt: new Date().toISOString() }
  writeAll(all)
}

/**
 * @deprecated Fire-and-forget sync hides API failures. Use `patchMortgageWorkflowAsync` and check `synced`.
 */
export function patchMortgageWorkflow(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): MortgageWorkflowLocalState | null {
  console.error(
    '[mortgageWorkflow] patchMortgageWorkflow is deprecated — use patchMortgageWorkflowAsync and surface sync errors',
  )
  return applyMortgageWorkflowPatch(applicationId, patch)
}

export type MortgageWorkflowPatchResult = {
  state: MortgageWorkflowLocalState
  /** False when local state saved but account-ms sync failed (Plata will not advance). */
  synced: boolean
  syncError?: string
}

/** Persist locally only after API sync succeeds (when a sync payload exists). */
export async function patchMortgageWorkflowAsync(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): Promise<MortgageWorkflowPatchResult | null> {
  if (!applicationId) return null
  const existing = readMortgageWorkflow(applicationId)
  const preview: MortgageWorkflowLocalState = {
    applicationId,
    productId: existing?.productId || String(patch.productId || '').trim(),
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  const result = await syncMortgageWorkflowPatchToApi(applicationId, patch, preview)
  if (!result.ok) {
    console.error('[mortgageWorkflow] API sync failed — local state not updated:', result.error)
    return {
      state: existing || preview,
      synced: false,
      syncError: result.error,
    }
  }

  const next = applyMortgageWorkflowPatch(applicationId, patch)
  if (!next) return null
  return { state: next, synced: true }
}

/**
 * Upsert local workflow state. Creates a minimal record when missing so API sync
 * still runs (e.g. virtual tour completed from pending screen).
 */
function applyMortgageWorkflowPatch(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): MortgageWorkflowLocalState | null {
  if (!applicationId) return null
  const existing = readMortgageWorkflow(applicationId)
  const next: MortgageWorkflowLocalState = {
    applicationId,
    productId: existing?.productId || String(patch.productId || '').trim(),
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  saveMortgageWorkflow(next)
  return next
}

export function initMortgageWorkflowSubmitted(
  applicationId: string,
  productId: string,
  downPaymentMethod?: MortgageDownPaymentMethod,
) {
  saveMortgageWorkflow({
    applicationId,
    productId,
    downPaymentMethod,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Drop a stale local tour flag when the backend never recorded virtualInspection.completedAt
 * (e.g. previous bug wrote localStorage before a failed sync).
 */
export function clearUnsyncedVirtualTourFlag(applicationId: string, paf?: unknown) {
  const local = readMortgageWorkflow(applicationId)
  if (!local?.virtualTourCompleted) return
  if (isVirtualInspectionComplete(paf as PostApprovalFulfillment | null | undefined)) return
  applyMortgageWorkflowPatch(applicationId, { virtualTourCompleted: false })
}

function isMerchantApproved(application: StorefrontApplication): boolean {
  const workflow = String(application.loanWorkflowStatus || '').toLowerCase()
  const status = String(application.status || '').toLowerCase()
  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  const pafStatus = String(paf?.status || '').toLowerCase()
  const stepId = normalizeWorkflowStepId(paf?.currentWorkflowStepId)

  return (
    workflow === 'approved' ||
    workflow === 'offer_sent' ||
    workflow === 'offer_pending' ||
    status === 'approved' ||
    status === 'completed' ||
    status === 'active' ||
    pafStatus === 'offer_pending' ||
    pafStatus === 'offer_accepted' ||
    stepId === 'virtual_tour' ||
    stepId === 'virtual_inspection' ||
    stepId === 'offer_letter'
  )
}

function stepFromCurrentWorkflowStepId(
  stepId: string,
  local: MortgageWorkflowLocalState | null,
  _tourDone: boolean,
): MortgageWorkflowStep | null {
  if (!stepId) return null
  // Trust backend currentWorkflowStepId — do not clamp offer_letter back to virtual_tour.
  if (stepId === 'virtual_tour' || stepId === 'virtual_inspection') {
    return 'virtual_tour'
  }
  if (stepId === 'offer_letter') {
    if (!local?.offerLetterDownloaded) return 'offer_letter'
    if (!local?.offerAccepted) return 'accept_offer'
    return 'accept_offer'
  }
  if (stepId === 'inspection_booking' || stepId === 'appointment' || stepId === 'appointment_scheduled') {
    return 'book_inspection'
  }
  if (stepId === 'inspection_outcome' || stepId === 'physical_inspection') {
    return local?.inspectionCompleted ? 'down_payment' : 'book_inspection'
  }
  if (stepId === 'down_payment' || stepId === 'equity_payment') return 'down_payment'
  if (stepId === 'contract_issued' || stepId === 'contract_signed') {
    return local?.contractAccepted ? 'mortgage_allocation' : 'contract_signing'
  }
  if (stepId === 'loan_disbursement' || stepId === 'disbursement') return 'mortgage_allocation'
  if (stepId === 'application_submission' || stepId === 'review_approval') {
    return 'application_submission'
  }
  return null
}

function stepFromPostApproval(
  status: PostApprovalMortgageStatus,
  local: MortgageWorkflowLocalState | null,
  paf?: PostApprovalFulfillment | null,
): MortgageWorkflowStep {
  const offerAcceptedLocally = Boolean(local?.offerAccepted)
  const tourDone = isVirtualInspectionComplete(paf)
  const stepId = normalizeWorkflowStepId(paf?.currentWorkflowStepId)

  const fromStep = stepFromCurrentWorkflowStepId(stepId, local, tourDone)
  if (fromStep) return fromStep

  switch (status) {
    case 'offer_pending':
      // No currentWorkflowStepId — only stay on tour while backend is still on virtual_inspection.
      if (stepId === 'virtual_tour' || stepId === 'virtual_inspection') return 'virtual_tour'
      if (!local?.offerLetterDownloaded) return 'offer_letter'
      if (!offerAcceptedLocally) return 'accept_offer'
      return 'accept_offer'
    case 'offer_accepted':
      if (!local?.offerLetterDownloaded) return 'offer_letter'
      if (!offerAcceptedLocally) return 'accept_offer'
      if (!local?.inspectionScheduled) return 'book_inspection'
      if (!local?.inspectionCompleted) return 'book_inspection'
      return 'down_payment'
    case 'appointment_scheduled':
    case 'inspection_in_progress':
      if (!offerAcceptedLocally) return 'accept_offer'
      return local?.inspectionCompleted ? 'down_payment' : 'book_inspection'
    case 'down_payment_pending':
    case 'down_payment_paid':
      return 'down_payment'
    case 'down_payment_confirmed':
      return 'contract_signing'
    case 'contract_issued':
    case 'contract_signed':
      return local?.contractAccepted ? 'mortgage_allocation' : 'contract_signing'
    case 'disbursed':
      return 'mortgage_allocation'
    case 'offer_declined':
    case 'inspection_declined':
      return 'declined'
    default:
      return 'application_submission'
  }
}

export function resolveMortgageWorkflowStep(
  application: StorefrontApplication,
  local: MortgageWorkflowLocalState | null,
): MortgageWorkflowStep {
  if (local?.cancelled || local?.offerDeclined) return 'declined'

  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  if (paf) {
    if (paf.status) {
      return stepFromPostApproval(paf.status, local, paf)
    }
    const fromStep = stepFromCurrentWorkflowStepId(
      normalizeWorkflowStepId(paf.currentWorkflowStepId),
      local,
      isVirtualInspectionComplete(paf),
    )
    if (fromStep) return fromStep
  }

  // Local-only path (no postApprovalFulfillment yet) — same order as docs.
  // Never advance past virtual tour from localStorage alone (must sync to backend for Plata).
  if (local?.allocationDownloaded) return 'mortgage_allocation'
  if (local?.contractAccepted) return 'mortgage_allocation'
  if (local?.downPaymentConfirmed) return 'contract_signing'
  if (local?.inspectionCompleted) return 'down_payment'
  if (local?.inspectionScheduled) return 'book_inspection'
  if (local?.offerAccepted) return 'book_inspection'
  if (local?.offerLetterDownloaded) return 'accept_offer'
  if (isMerchantApproved(application)) return 'virtual_tour'
  return 'application_submission'
}

export type MortgageThreadItem = {
  step: MortgageWorkflowStep
  stepNumber: number
  title: string
  description: string
  status: 'done' | 'current' | 'upcoming'
  actionLabel?: string
}

const THREAD_ORDER: Array<Exclude<MortgageWorkflowStep, 'declined'>> = [
  'application_submission',
  'virtual_tour',
  'offer_letter',
  'accept_offer',
  'book_inspection',
  'down_payment',
  'contract_signing',
  'mortgage_allocation',
]

const STEP_META: Record<
  Exclude<MortgageWorkflowStep, 'declined'>,
  { title: string; description: string; actionLabel?: string }
> = {
  application_submission: {
    title: 'Application Submission',
    description: 'Your application has been received. The merchant will review and respond shortly.',
  },
  virtual_tour: {
    title: 'Virtual Tour',
    description: 'Explore the property location, video tour, and photos before continuing.',
    actionLabel: 'Start virtual tour',
  },
  offer_letter: {
    title: 'Offer Letter',
    description: 'Your mortgage offer letter is ready. Download and review it before accepting.',
    actionLabel: 'Download offer letter',
  },
  accept_offer: {
    title: 'Accept Offer',
    description: 'Review the offer letter, then accept or decline to continue.',
    actionLabel: 'Accept offer',
  },
  book_inspection: {
    title: 'Book Inspection',
    description: 'Choose an available time slot to inspect the property in person, then confirm the visit.',
    actionLabel: 'Book inspection',
  },
  down_payment: {
    title: 'Down Payment',
    description: 'Pay the required equity from your Central Wallet or by bank transfer to the merchant repayment account.',
    actionLabel: 'Pay down payment',
  },
  contract_signing: {
    title: 'Contract Signing',
    description: 'Download the contract, sign it, and upload the signed copy.',
    actionLabel: 'Sign contract',
  },
  mortgage_allocation: {
    title: 'Mortgage Allocation',
    description: 'Your mortgage allocation document is ready to download.',
    actionLabel: 'Download allocation',
  },
}

export function buildMortgageThread(
  current: MortgageWorkflowStep,
  options?: { workflowComplete?: boolean },
): MortgageThreadItem[] {
  if (current === 'declined') {
    return [
      {
        step: 'declined',
        stepNumber: 0,
        title: 'Offer declined',
        description: 'You declined this mortgage offer.',
        status: 'current',
      },
    ]
  }

  const currentIndex = options?.workflowComplete ? THREAD_ORDER.length : THREAD_ORDER.indexOf(current)
  return THREAD_ORDER.map((step, index) => ({
    step,
    stepNumber: index + 1,
    ...STEP_META[step],
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

export type MortgageWorkflowModal =
  | 'virtual_tour'
  | 'offer_letter'
  | 'book_inspection'
  | 'accept_offer'
  | 'down_payment'
  | 'contract_signing'
  | 'mortgage_allocation'

export function mortgageStepToModal(step: MortgageWorkflowStep): MortgageWorkflowModal | null {
  switch (step) {
    case 'virtual_tour':
      return 'virtual_tour'
    case 'offer_letter':
      return 'offer_letter'
    case 'book_inspection':
      return 'book_inspection'
    case 'accept_offer':
      return 'accept_offer'
    case 'down_payment':
      return 'down_payment'
    case 'contract_signing':
      return 'contract_signing'
    case 'mortgage_allocation':
      return 'mortgage_allocation'
    default:
      return null
  }
}

export function mortgageStepCta(
  step: MortgageWorkflowStep,
  productId: string,
  applicationId: string,
): { label: string; href: string; modal?: MortgageWorkflowModal } | null {
  const base = `/mobile-v2/products/mortgage`
  const pendingHref = `${base}/pending/${encodeURIComponent(applicationId)}`
  const q = `productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}`
  const modal = mortgageStepToModal(step)

  switch (step) {
    case 'application_submission':
      return {
        label: 'Continue application',
        href: `${base}/apply?${q}`,
      }
    case 'virtual_tour':
      return {
        label: STEP_META.virtual_tour.actionLabel ?? 'Start virtual tour',
        href: `${pendingHref}?action=virtual_tour`,
        modal: 'virtual_tour',
      }
    case 'offer_letter':
      return {
        label: STEP_META.offer_letter.actionLabel ?? 'Download offer letter',
        href: `${pendingHref}?action=offer_letter`,
        modal: 'offer_letter',
      }
    case 'book_inspection':
      return {
        label: STEP_META.book_inspection.actionLabel ?? 'Book inspection',
        href: `${pendingHref}?action=book_inspection`,
        modal: 'book_inspection',
      }
    case 'accept_offer':
      return {
        label: STEP_META.accept_offer.actionLabel ?? 'Accept offer',
        href: `${pendingHref}?action=accept_offer`,
        modal: 'accept_offer',
      }
    case 'down_payment':
      return {
        label: STEP_META.down_payment.actionLabel ?? 'Make payment',
        href: `${pendingHref}?action=down_payment`,
        modal: 'down_payment',
      }
    case 'contract_signing':
      return {
        label: STEP_META.contract_signing.actionLabel ?? 'Sign contract',
        href: `${pendingHref}?action=contract_signing`,
        modal: 'contract_signing',
      }
    case 'mortgage_allocation':
      return {
        label: STEP_META.mortgage_allocation.actionLabel ?? 'Download allocation',
        href: `${pendingHref}?action=mortgage_allocation`,
        modal: 'mortgage_allocation',
      }
    default:
      return null
  }
}

export function computeDownPaymentAmount(
  propertyValue?: number | null,
  percent = 10,
): number | null {
  if (!propertyValue || Number.isNaN(propertyValue)) return null
  return Math.round(propertyValue * (percent / 100))
}
