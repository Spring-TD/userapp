import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'

/** 5-step loan workflow after application submission — resolved from backend only. */
export type LoanWorkflowStep =
  | 'pending_approval'
  | 'approved'
  | 'accept_offer'
  | 'awaiting_disbursement'
  | 'loan_disbursed'
  | 'declined'

function normalize(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function fulfillment(application: StorefrontApplication): Record<string, unknown> {
  return asRecord(application.postApprovalFulfillment) ?? {}
}

function loanProgress(application: StorefrontApplication) {
  const raw = application as unknown as Record<string, unknown>
  const paf = fulfillment(application)
  const offer = asRecord(paf.offer)
  const disbursement = asRecord(raw.loanDisbursement) ?? {}
  const nested = asRecord(disbursement.loanWorkflow) ?? disbursement
  const snapshot = asRecord(raw.contractSnapshot) ?? {}
  return {
    offerAcceptedAt: pickString(
      nested.offerAcceptedAt,
      snapshot.offerAcceptedAt,
      offer?.acceptedAt,
      paf.offerAcceptedAt,
    ),
    offerDeclinedAt: pickString(nested.offerDeclinedAt, snapshot.offerDeclinedAt, offer?.declinedAt),
    disbursedAt: pickString(nested.disbursedAt, disbursement.disbursedAt, snapshot.disbursedAt, paf.disbursedAt),
    pafStatus: normalize(typeof paf.status === 'string' ? paf.status : ''),
    stepId: normalize(typeof paf.currentWorkflowStepId === 'string' ? paf.currentWorkflowStepId : ''),
  }
}

function isDeclined(application: StorefrontApplication): boolean {
  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  const progress = loanProgress(application)
  return (
    Boolean(progress.offerDeclinedAt) ||
    progress.pafStatus === 'offer_declined' ||
    ['declined', 'rejected', 'cancelled', 'canceled', 'blacklisted'].some(
      (token) => status === token || workflow === token,
    )
  )
}

function isDisbursed(application: StorefrontApplication): boolean {
  const progress = loanProgress(application)
  if (progress.disbursedAt) return true
  if (progress.pafStatus === 'disbursed' || progress.pafStatus === 'loan_disbursed') return true
  if (progress.pafStatus.includes('disbursed') && !progress.pafStatus.includes('awaiting')) return true
  if (progress.stepId === 'loan_disbursed' || progress.stepId === 'disbursed') return true
  const completed = fulfillment(application).completedWorkflowSteps
  if (
    Array.isArray(completed) &&
    completed.some((step) => {
      const token = normalize(String(step))
      return token === 'loan_disbursed' || token === 'disbursed'
    })
  ) {
    return true
  }

  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  if (status.includes('disbursed') && !status.includes('awaiting')) return true
  if (workflow.includes('disbursed') && !workflow.includes('awaiting')) return true

  if (isOfferAccepted(application)) {
    if (['active', 'completed', 'successful'].includes(status)) return true
    if (['active', 'completed', 'successful'].includes(workflow)) return true
  }

  const walletBalance = Number(
    application.productWallet?.upstreamAccount?.balance ?? application.account?.balance ?? NaN,
  )
  return (
    Number.isFinite(walletBalance) &&
    walletBalance > 0 &&
    isOfferAccepted(application)
  )
}

function isOfferAccepted(application: StorefrontApplication): boolean {
  const progress = loanProgress(application)
  if (progress.offerAcceptedAt) return true
  if (progress.pafStatus === 'offer_accepted') return true
  if (progress.pafStatus.includes('disburs') && progress.pafStatus !== 'offer_declined') return true

  const workflow = normalize(application.loanWorkflowStatus)
  return (
    workflow === 'awaiting_disbursement' ||
    workflow === 'offer_accepted' ||
    workflow.includes('awaiting_disburs')
  )
}

function isMerchantApproved(application: StorefrontApplication): boolean {
  const status = normalize(application.status)
  const workflow = normalize(application.loanWorkflowStatus)
  const pafStatus = loanProgress(application).pafStatus
  return (
    workflow === 'approved' ||
    workflow === 'offer_sent' ||
    workflow === 'awaiting_acceptance' ||
    workflow === 'awaiting_disbursement' ||
    workflow.includes('offer') ||
    workflow.includes('disburs') ||
    status === 'approved' ||
    status === 'active' ||
    status === 'completed' ||
    status === 'disbursed' ||
    pafStatus === 'offer_pending' ||
    pafStatus === 'offer_sent' ||
    pafStatus === 'offer_accepted' ||
    pafStatus.includes('disburs')
  )
}

export function preferLoanWorkflowStatus(
  ...vals: Array<string | null | undefined>
): string | undefined {
  const rank = (value?: string | null) => {
    const n = normalize(value)
    if (!n) return -1
    if (['declined', 'rejected', 'cancelled', 'canceled', 'blacklisted'].includes(n)) return 0
    if (n === 'loan_disbursed' || n === 'disbursed' || n === 'completed') return 60
    if (n === 'active') return 55
    if (n.includes('awaiting_disburs') || n === 'offer_accepted') return 40
    if (n.includes('offer')) return 30
    if (n === 'approved') return 20
    if (n === 'under_review' || n === 'guarantor_kyc_requested') return 10
    return 5
  }
  return vals.reduce<string | undefined>((best, current) => {
    if (!current?.trim()) return best
    if (!best) return current
    return rank(current) >= rank(best) ? current : best
  }, undefined)
}

export function resolveLoanWorkflowStep(application: StorefrontApplication): LoanWorkflowStep {
  if (isDeclined(application)) return 'declined'
  if (isDisbursed(application)) return 'loan_disbursed'
  if (isOfferAccepted(application)) return 'awaiting_disbursement'
  if (isMerchantApproved(application)) return 'accept_offer'
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
    description:
      'Review the offer terms and pay any required down payment from your central wallet to accept.',
    actionLabel: 'Accept offer',
  },
  awaiting_disbursement: {
    title: 'Awaiting disbursement',
    description: 'Your offer was accepted. Funds will be disbursed to your loan wallet shortly.',
  },
  loan_disbursed: {
    title: 'Loan disbursed',
    description: 'Your loan has been disbursed. Open product details to view your amortization schedule.',
    actionLabel: 'View repayment schedule',
  },
}

export function buildLoanThread(current: LoanWorkflowStep): LoanThreadItem[] {
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

  // "Approved" is a backend status on the way to accept-offer, not a locally acknowledged step.
  const displayCurrent: LoanWorkflowStep = current === 'accept_offer' ? 'accept_offer' : current
  const currentIndex = Math.max(0, THREAD_ORDER.indexOf(displayCurrent))

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
    case 'accept_offer':
      return {
        label: STEP_META.accept_offer.actionLabel ?? 'Accept offer',
        href: `${pendingHref}?action=accept_offer`,
        modal: 'accept_offer',
      }
    case 'loan_disbursed':
      return {
        label: 'View repayment schedule',
        href: `/mobile-v2/accounts/${encodeURIComponent(applicationId)}/product`,
      }
    default:
      return null
  }
}

export function loanNextStepLabel(application: StorefrontApplication): string {
  const step = resolveLoanWorkflowStep(application)
  const thread = buildLoanThread(step)
  return thread.find((item) => item.status === 'current')?.title ?? 'In progress'
}
