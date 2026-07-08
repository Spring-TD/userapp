import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { syncMortgageWorkflowPatchToApi } from '@/lib/mortgageWorkflowApi'
import {
  extractPostApprovalFulfillment,
  type PostApprovalMortgageStatus,
} from '@/lib/postApprovalMortgage'

/** 8-step mortgage workflow aligned with Spring merchant spec. */
export type MortgageWorkflowStep =
  | 'application_submission'
  | 'offer_letter'
  | 'inspection_booking'
  | 'inspection_outcome'
  | 'down_payment'
  | 'contract_issued'
  | 'contract_signed'
  | 'loan_disbursement'
  | 'declined'

export type MortgageDownPaymentMethod = 'savings_plan' | 'equity_contribution'

export type MortgageWorkflowLocalState = {
  applicationId: string
  productId: string
  downPaymentMethod?: MortgageDownPaymentMethod
  offerAccepted?: boolean
  offerDeclined?: boolean
  inspectionScheduled?: boolean
  inspectionCompleted?: boolean
  downPaymentConfirmed?: boolean
  contractAccepted?: boolean
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

function stepFromPostApproval(status: PostApprovalMortgageStatus): MortgageWorkflowStep {
  switch (status) {
    case 'offer_pending':
      return 'offer_letter'
    case 'offer_accepted':
    case 'appointment_scheduled':
      return 'inspection_booking'
    case 'inspection_in_progress':
      return 'inspection_outcome'
    case 'down_payment_pending':
    case 'down_payment_paid':
      return 'down_payment'
    case 'down_payment_confirmed':
      return 'contract_issued'
    case 'contract_issued':
      return 'contract_signed'
    case 'contract_signed':
      return 'loan_disbursement'
    case 'disbursed':
      return 'loan_disbursement'
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
    return stepFromPostApproval(paf.status)
  }

  if (local?.offerDeclined) return 'declined'
  if (local?.contractAccepted) return 'loan_disbursement'
  if (local?.downPaymentConfirmed) return 'contract_issued'
  if (local?.inspectionCompleted) return 'down_payment'
  if (local?.inspectionScheduled) return 'inspection_outcome'
  if (local?.offerAccepted) return 'inspection_booking'
  if (isMerchantApproved(application)) return 'offer_letter'
  return 'application_submission'
}

export type MortgageThreadItem = {
  step: MortgageWorkflowStep
  stepNumber: number
  title: string
  description: string
  status: 'done' | 'current' | 'upcoming'
}

const THREAD_ORDER: MortgageWorkflowStep[] = [
  'application_submission',
  'offer_letter',
  'inspection_booking',
  'inspection_outcome',
  'down_payment',
  'contract_issued',
  'contract_signed',
  'loan_disbursement',
]

const STEP_META: Record<
  Exclude<MortgageWorkflowStep, 'declined'>,
  { title: string; description: string }
> = {
  application_submission: {
    title: 'Application Submission',
    description: 'Your application has been received. The merchant will review and respond shortly.',
  },
  offer_letter: {
    title: 'Offer Letter',
    description: 'Your mortgage offer letter is ready. Review and accept to continue.',
  },
  inspection_booking: {
    title: 'Inspection Booking',
    description: 'Book an appointment to inspect the property.',
  },
  inspection_outcome: {
    title: 'Inspection Outcome',
    description: 'Complete your inspection and confirm the outcome.',
  },
  down_payment: {
    title: 'Down Payment',
    description: 'Confirm your equity contribution to proceed.',
  },
  contract_issued: {
    title: 'Contract Issued',
    description: 'Your loan contract has been dispatched. Review it before signing.',
  },
  contract_signed: {
    title: 'Contract Signed',
    description: 'Review and accept your loan approval contract.',
  },
  loan_disbursement: {
    title: 'Loan Disbursement',
    description: 'Your mortgage has been approved and funds will be disbursed.',
  },
}

export function buildMortgageThread(current: MortgageWorkflowStep): MortgageThreadItem[] {
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

  const currentIndex = THREAD_ORDER.indexOf(current)
  return THREAD_ORDER.map((step, index) => ({
    step,
    stepNumber: index + 1,
    ...STEP_META[step],
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

export function mortgageStepCta(
  step: MortgageWorkflowStep,
  productId: string,
  applicationId: string,
): { label: string; href: string } | null {
  const base = `/mobile-v2/products/mortgage`
  const q = `productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}`

  switch (step) {
    case 'application_submission':
      return null
    case 'offer_letter':
      return {
        label: 'Continue',
        href: `${base}/offer/accept?${q}`,
      }
    case 'inspection_booking':
      return {
        label: 'Book inspection',
        href: `${base}/offer?${q}&step=schedule_inspection`,
      }
    case 'inspection_outcome':
      return {
        label: 'Continue inspection',
        href: `${base}/offer?${q}&step=inspection`,
      }
    case 'down_payment':
      return {
        label: 'Pay down payment',
        href: `${base}/offer?${q}&step=down_payment`,
      }
    case 'contract_issued':
    case 'contract_signed':
      return {
        label: 'Review contract',
        href: `${base}/offer?${q}&step=contract`,
      }
    case 'loan_disbursement':
      return { label: 'View mortgage', href: `${base}` }
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
