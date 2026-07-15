import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'

/** 5-step loan workflow after application submission. */
export type LoanWorkflowStep =
  | 'pending_approval'
  | 'approved'
  | 'accept_offer'
  | 'awaiting_disbursement'
  | 'loan_disbursed'
  | 'declined'

export type LoanWorkflowLocalState = {
  applicationId: string
  productId: string
  approvalAcknowledged?: boolean
  offerAccepted?: boolean
  offerDeclined?: boolean
  disbursementSeen?: boolean
  updatedAt: string
}

const STORAGE_KEY = 'mobile_v2_loan_workflow_v1'

function readAll(): Record<string, LoanWorkflowLocalState> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, LoanWorkflowLocalState>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, LoanWorkflowLocalState>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function readLoanWorkflow(applicationId: string): LoanWorkflowLocalState | null {
  if (!applicationId) return null
  return readAll()[applicationId] ?? null
}

export function saveLoanWorkflow(state: LoanWorkflowLocalState) {
  if (!state.applicationId) return
  const all = readAll()
  all[state.applicationId] = { ...state, updatedAt: new Date().toISOString() }
  writeAll(all)
}

export function patchLoanWorkflow(
  applicationId: string,
  patch: Partial<LoanWorkflowLocalState>,
): LoanWorkflowLocalState | null {
  const existing = readLoanWorkflow(applicationId)
  if (!existing) return null
  const next = { ...existing, ...patch, applicationId, updatedAt: new Date().toISOString() }
  saveLoanWorkflow(next)
  return next
}

export function initLoanWorkflowSubmitted(applicationId: string, productId: string) {
  saveLoanWorkflow({
    applicationId,
    productId,
    updatedAt: new Date().toISOString(),
  })
}

function normalize(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function isDeclined(application: StorefrontApplication, local: LoanWorkflowLocalState | null): boolean {
  if (local?.offerDeclined) return true
  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  return ['declined', 'rejected', 'cancelled', 'canceled'].some(
    (token) => status.includes(token) || workflow.includes(token),
  )
}

function isDisbursed(application: StorefrontApplication): boolean {
  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  return ['disbursed', 'active', 'completed', 'successful'].some(
    (token) => status.includes(token) || workflow.includes(token),
  )
}

function isMerchantApproved(application: StorefrontApplication): boolean {
  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  return (
    workflow === 'approved' ||
    workflow === 'offer_sent' ||
    workflow === 'awaiting_disbursement' ||
    workflow.includes('disburs') ||
    status === 'approved' ||
    status === 'active' ||
    status === 'completed' ||
    status === 'disbursed'
  )
}

function hasOfferReady(application: StorefrontApplication): boolean {
  const workflow = normalize(application.loanWorkflowStatus)
  return (
    workflow === 'offer_sent' ||
    workflow === 'awaiting_acceptance' ||
    workflow.includes('offer') ||
    isMerchantApproved(application)
  )
}

export function resolveLoanWorkflowStep(
  application: StorefrontApplication,
  local: LoanWorkflowLocalState | null,
): LoanWorkflowStep {
  if (isDeclined(application, local)) return 'declined'

  if (isDisbursed(application) || local?.disbursementSeen) return 'loan_disbursed'

  if (local?.offerAccepted) return 'awaiting_disbursement'

  const workflow = normalize(application.loanWorkflowStatus)
  if (workflow === 'awaiting_disbursement' || workflow.includes('awaiting_disburs')) {
    return 'awaiting_disbursement'
  }

  if (hasOfferReady(application)) {
    if (!local?.approvalAcknowledged) return 'approved'
    return 'accept_offer'
  }

  return 'pending_approval'
}

export type LoanThreadItem = {
  step: LoanWorkflowStep
  stepNumber: number
  title: string
  description: string
  status: 'done' | 'current' | 'upcoming'
  actionLabel?: string
}

const THREAD_ORDER: Array<Exclude<LoanWorkflowStep, 'declined'>> = [
  'pending_approval',
  'approved',
  'accept_offer',
  'awaiting_disbursement',
  'loan_disbursed',
]

const STEP_META: Record<
  Exclude<LoanWorkflowStep, 'declined'>,
  { title: string; description: string; actionLabel?: string }
> = {
  pending_approval: {
    title: 'Pending approval',
    description: 'Your loan application has been submitted and is awaiting merchant review.',
  },
  approved: {
    title: 'Approved',
    description: 'Your loan has been approved. Review the offer details to continue.',
    actionLabel: 'View approval',
  },
  accept_offer: {
    title: 'Accept offer',
    description: 'Accept the loan offer to begin disbursement processing.',
    actionLabel: 'Accept offer',
  },
  awaiting_disbursement: {
    title: 'Awaiting disbursement',
    description: 'Your offer was accepted. Funds will be disbursed to your loan wallet shortly.',
  },
  loan_disbursed: {
    title: 'Loan disbursed',
    description: 'Your loan has been disbursed. Check your loan wallet for the credited funds.',
    actionLabel: 'Check loan wallet',
  },
}

export function buildLoanThread(
  current: LoanWorkflowStep,
  options?: { workflowComplete?: boolean },
): LoanThreadItem[] {
  if (current === 'declined') {
    return [
      {
        step: 'declined',
        stepNumber: 0,
        title: 'Offer declined',
        description: 'This loan offer was declined.',
        status: 'current',
      },
    ]
  }

  const currentIndex = options?.workflowComplete
    ? THREAD_ORDER.length
    : Math.max(0, THREAD_ORDER.indexOf(current))

  return THREAD_ORDER.map((step, index) => ({
    step,
    stepNumber: index + 1,
    ...STEP_META[step],
    status: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

export type LoanWorkflowModal = 'approved' | 'accept_offer'

export function loanStepToModal(step: LoanWorkflowStep): LoanWorkflowModal | null {
  switch (step) {
    case 'approved':
      return 'approved'
    case 'accept_offer':
      return 'accept_offer'
    default:
      return null
  }
}

export function loanStepCta(
  step: LoanWorkflowStep,
  applicationId: string,
): { label: string; href: string; modal?: LoanWorkflowModal } | null {
  const pendingHref = `/mobile-v2/products/loan/pending/${encodeURIComponent(applicationId)}`

  switch (step) {
    case 'approved':
      return {
        label: STEP_META.approved.actionLabel ?? 'View approval',
        href: `${pendingHref}?action=approved`,
        modal: 'approved',
      }
    case 'accept_offer':
      return {
        label: STEP_META.accept_offer.actionLabel ?? 'Accept offer',
        href: `${pendingHref}?action=accept_offer`,
        modal: 'accept_offer',
      }
    case 'loan_disbursed':
      return {
        label: STEP_META.loan_disbursed.actionLabel ?? 'Check loan wallet',
        href: '/mobile-v2/accounts',
      }
    default:
      return null
  }
}

export function loanNextStepLabel(application: StorefrontApplication): string {
  const applicationId = String(application.id ?? application._id ?? '')
  const local = readLoanWorkflow(applicationId)
  const step = resolveLoanWorkflowStep(application, local)
  const thread = buildLoanThread(step)
  return thread.find((item) => item.status === 'current')?.title ?? 'In progress'
}
