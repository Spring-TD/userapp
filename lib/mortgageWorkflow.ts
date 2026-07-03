import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { syncMortgageWorkflowPatchToApi } from '@/lib/mortgageWorkflowApi'
import {
  extractPostApprovalFulfillment,
  type PostApprovalMortgageStatus,
} from '@/lib/postApprovalMortgage'

export type MortgageWorkflowStep =
  | 'awaiting_approval'
  | 'accept_offer'
  | 'schedule_inspection'
  | 'inspection_in_progress'
  | 'down_payment'
  | 'accept_contract'
  | 'disbursed'
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
      return 'accept_offer'
    case 'offer_accepted':
    case 'appointment_scheduled':
      return 'schedule_inspection'
    case 'inspection_in_progress':
      return 'inspection_in_progress'
    case 'down_payment_pending':
    case 'down_payment_paid':
      return 'down_payment'
    case 'down_payment_confirmed':
    case 'contract_issued':
      return 'accept_contract'
    case 'contract_signed':
    case 'disbursed':
      return 'disbursed'
    case 'offer_declined':
    case 'inspection_declined':
      return 'declined'
    default:
      return 'awaiting_approval'
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
  if (local?.contractAccepted) return 'disbursed'
  if (local?.downPaymentConfirmed) return 'accept_contract'
  if (local?.inspectionCompleted) return 'down_payment'
  if (local?.inspectionScheduled) return 'inspection_in_progress'
  if (local?.offerAccepted && !local.inspectionScheduled) return 'schedule_inspection'
  if (isMerchantApproved(application) && !local?.offerAccepted) return 'accept_offer'
  return 'awaiting_approval'
}

export type MortgageThreadItem = {
  step: MortgageWorkflowStep
  title: string
  description: string
  status: 'done' | 'current' | 'upcoming'
}

const THREAD_ORDER: MortgageWorkflowStep[] = [
  'awaiting_approval',
  'accept_offer',
  'schedule_inspection',
  'inspection_in_progress',
  'down_payment',
  'accept_contract',
  'disbursed',
]

const STEP_META: Record<MortgageWorkflowStep, { title: string; description: string }> = {
  awaiting_approval: {
    title: 'Application submitted',
    description: 'Your application has been received. The merchant will review and respond shortly.',
  },
  accept_offer: {
    title: 'Accept offer',
    description: 'Your mortgage offer letter is ready. Review and accept to continue.',
  },
  schedule_inspection: {
    title: 'Schedule inspection',
    description: 'Book an appointment to inspect the property.',
  },
  inspection_in_progress: {
    title: 'Inspection in progress',
    description: 'Visit the property within two to three working days.',
  },
  down_payment: {
    title: 'Down payment',
    description: 'Confirm your equity contribution to proceed.',
  },
  accept_contract: {
    title: 'Loan contract',
    description: 'Review and accept your loan approval contract.',
  },
  disbursed: {
    title: 'Disbursed',
    description: 'Your mortgage has been approved and funds disbursed.',
  },
  declined: {
    title: 'Offer declined',
    description: 'You declined this mortgage offer.',
  },
}

export function buildMortgageThread(
  current: MortgageWorkflowStep,
): MortgageThreadItem[] {
  if (current === 'declined') {
    return [{ step: 'declined', ...STEP_META.declined, status: 'current' }]
  }

  const currentIndex = THREAD_ORDER.indexOf(current)
  return THREAD_ORDER.map((step, index) => ({
    step,
    ...STEP_META[step],
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

export function mortgageStepCta(
  step: MortgageWorkflowStep,
  productId: string,
  applicationId: string,
): { label: string; href: string } | null {
  switch (step) {
    case 'awaiting_approval':
      return null
    case 'accept_offer':
      return {
        label: 'Continue',
        href: `/mobile-v2/products/mortgage/offer/accept?productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}`,
      }
    case 'schedule_inspection':
      return {
        label: 'Continue',
        href: `/mobile-v2/products/mortgage/offer?productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}&step=schedule_inspection`,
      }
    case 'inspection_in_progress':
      return {
        label: 'Continue',
        href: `/mobile-v2/products/mortgage/offer?productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}&step=inspection`,
      }
    case 'down_payment':
      return {
        label: 'Continue',
        href: `/mobile-v2/products/mortgage/offer?productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}&step=down_payment`,
      }
    case 'accept_contract':
      return {
        label: 'Continue',
        href: `/mobile-v2/products/mortgage/offer?productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}&step=contract`,
      }
    case 'disbursed':
      return { label: 'View mortgage', href: '/mobile-v2/products/mortgage' }
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
