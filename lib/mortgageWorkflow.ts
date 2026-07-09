import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { syncMortgageWorkflowPatchToApi } from '@/lib/mortgageWorkflowApi'
import {
  extractPostApprovalFulfillment,
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

export function patchMortgageWorkflow(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): MortgageWorkflowLocalState | null {
  const next = applyMortgageWorkflowPatch(applicationId, patch)
  if (next) {
    void syncMortgageWorkflowPatchToApi(applicationId, patch, next).then((result) => {
      if (!result.ok) {
        console.warn('[mortgageWorkflow] API sync failed:', result.error)
      }
    })
  }
  return next
}

/** Persist locally and await API sync (use before navigation on critical steps). */
export async function patchMortgageWorkflowAsync(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): Promise<MortgageWorkflowLocalState | null> {
  const next = applyMortgageWorkflowPatch(applicationId, patch)
  if (!next) return null
  const result = await syncMortgageWorkflowPatchToApi(applicationId, patch, next)
  if (!result.ok) {
    console.warn('[mortgageWorkflow] API sync failed:', result.error)
  }
  return next
}

function applyMortgageWorkflowPatch(
  applicationId: string,
  patch: Partial<MortgageWorkflowLocalState>,
): MortgageWorkflowLocalState | null {
  const existing = readMortgageWorkflow(applicationId)
  if (!existing) return null
  const next = { ...existing, ...patch, applicationId, updatedAt: new Date().toISOString() }
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

function isMerchantApproved(application: StorefrontApplication): boolean {
  const workflow = String(application.loanWorkflowStatus || '').toLowerCase()
  const status = String(application.status || '').toLowerCase()
  return (
    workflow === 'approved' ||
    workflow === 'offer_sent' ||
    status === 'approved' ||
    status === 'completed' ||
    status === 'active'
  )
}

function stepFromPostApproval(
  status: PostApprovalMortgageStatus,
  local: MortgageWorkflowLocalState | null,
): MortgageWorkflowStep {
  switch (status) {
    case 'offer_pending':
      if (!local?.virtualTourCompleted) return 'virtual_tour'
      return 'offer_letter'
    case 'offer_accepted':
      if (!local?.offerLetterDownloaded) return 'offer_letter'
      if (!local?.inspectionScheduled) return 'book_inspection'
      return 'accept_offer'
    case 'appointment_scheduled':
      return local?.offerAccepted ? 'down_payment' : 'accept_offer'
    case 'inspection_in_progress':
      return 'accept_offer'
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
  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  if (paf?.status) {
    return stepFromPostApproval(paf.status, local)
  }

  if (local?.offerDeclined) return 'declined'
  if (local?.allocationDownloaded) return 'mortgage_allocation'
  if (local?.contractAccepted) return 'mortgage_allocation'
  if (local?.downPaymentConfirmed) return 'contract_signing'
  if (local?.offerAccepted || local?.signedOfferUploaded) return 'down_payment'
  if (local?.inspectionCompleted) return 'down_payment'
  if (local?.inspectionScheduled) return 'accept_offer'
  if (local?.offerLetterDownloaded) return 'book_inspection'
  if (local?.virtualTourCompleted) return 'offer_letter'
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

const THREAD_ORDER: MortgageWorkflowStep[] = [
  'application_submission',
  'virtual_tour',
  'offer_letter',
  'book_inspection',
  'accept_offer',
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
    description: 'Your mortgage offer letter is ready. Download and review it to continue.',
    actionLabel: 'Download offer letter',
  },
  book_inspection: {
    title: 'Book Inspection',
    description: 'Choose an available time slot to inspect the property in person.',
    actionLabel: 'Book inspection',
  },
  accept_offer: {
    title: 'Accept Offer',
    description: 'Accept the offer and upload your signed offer document.',
    actionLabel: 'Accept offer',
  },
  down_payment: {
    title: 'Down Payment',
    description: 'Review your wallet balance and pay the required down payment.',
    actionLabel: 'Make payment',
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
      return null
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
