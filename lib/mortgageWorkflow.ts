import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  extractPostApprovalFulfillment,
  isVirtualInspectionComplete,
  normalizeWorkflowStepId,
  type PostApprovalFulfillment,
} from '@/lib/postApprovalMortgage'

/**
 * Storefront mortgage workflow thread. Step resolution is backend-only
 * (postApprovalFulfillment / loanWorkflowStatus) — no localStorage.
 */
export type MortgageWorkflowStep =
  | 'application_submission'
  | 'merchant_decision'
  | 'virtual_inspection'
  | 'offer_letter'
  | 'accept_offer'
  | 'inspection_booking'
  | 'inspection_outcome'
  | 'down_payment'
  | 'contract_issued'
  | 'contract_signed'
  | 'loan_disbursement'
  | 'declined'
  /** @deprecated Use virtual_inspection */
  | 'virtual_tour'
  /** @deprecated Use inspection_booking */
  | 'book_inspection'
  /** @deprecated Use contract_signed */
  | 'contract_signing'
  /** @deprecated Use loan_disbursement */
  | 'mortgage_allocation'

const PLATA_POST_APPROVAL_STEPS = [
  'virtual_inspection',
  'offer_letter',
  'inspection_booking',
  'inspection_outcome',
  'down_payment',
  'contract_issued',
  'contract_signed',
  'loan_disbursement',
] as const

type CanonicalThreadStep = Exclude<
  MortgageWorkflowStep,
  'declined' | 'virtual_tour' | 'book_inspection' | 'contract_signing' | 'mortgage_allocation'
>

const CANONICAL_THREAD: CanonicalThreadStep[] = [
  'application_submission',
  'merchant_decision',
  'virtual_inspection',
  'offer_letter',
  'accept_offer',
  'inspection_booking',
  'inspection_outcome',
  'down_payment',
  'contract_issued',
  'contract_signed',
  'loan_disbursement',
]

export type MortgageDownPaymentMethod = 'savings_plan' | 'equity_contribution'

export function applicationKey(application: StorefrontApplication): string {
  return String(application.id ?? application._id ?? '').trim()
}

function workflowStatus(application: StorefrontApplication): string {
  return String(application.loanWorkflowStatus || '').toLowerCase()
}

function applicationStatus(application: StorefrontApplication): string {
  return String(application.status || '').toLowerCase()
}

export function isMerchantApproved(application: StorefrontApplication): boolean {
  const workflow = workflowStatus(application)
  const status = applicationStatus(application)
  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  if (paf?.status || paf?.currentWorkflowStepId) return true
  return (
    workflow === 'approved' ||
    workflow === 'offer_sent' ||
    workflow === 'offer_pending' ||
    status === 'approved' ||
    status === 'completed' ||
    status === 'active'
  )
}

export function isMerchantRejected(application: StorefrontApplication): boolean {
  const workflow = workflowStatus(application)
  const status = applicationStatus(application)
  return (
    workflow === 'declined' ||
    workflow === 'rejected' ||
    workflow === 'blacklisted' ||
    status === 'declined' ||
    status === 'rejected' ||
    status === 'cancelled'
  )
}

function canonicalizeStep(stepId: string): MortgageWorkflowStep | null {
  const id = normalizeWorkflowStepId(stepId)
  if (id === 'virtual_tour' || id === 'virtual_inspection') return 'virtual_inspection'
  if (id === 'offer_letter') return 'offer_letter'
  if (id === 'accept_offer') return 'accept_offer'
  if (id === 'inspection_booking' || id === 'appointment' || id === 'book_inspection') {
    return 'inspection_booking'
  }
  if (id === 'inspection_outcome' || id === 'physical_inspection') return 'inspection_outcome'
  if (id === 'down_payment' || id === 'equity_payment') return 'down_payment'
  if (id === 'contract_issued') return 'contract_issued'
  if (id === 'contract_signed' || id === 'contract_signing') return 'contract_signed'
  if (id === 'loan_disbursement' || id === 'disbursement' || id === 'mortgage_allocation') {
    return 'loan_disbursement'
  }
  if (id === 'merchant_decision' || id === 'review_approval') return 'merchant_decision'
  if (id === 'application_submission') return 'application_submission'
  return null
}

function expandPlataStepToStorefront(stepId: string): CanonicalThreadStep[] {
  const canonical = canonicalizeStep(stepId)
  if (canonical === 'offer_letter') return ['offer_letter', 'accept_offer']
  if (canonical && (PLATA_POST_APPROVAL_STEPS as readonly string[]).includes(canonical)) {
    return [canonical as CanonicalThreadStep]
  }
  return []
}

function threadOrder(paf: PostApprovalFulfillment | null): CanonicalThreadStep[] {
  const fromBackend = (paf?.workflowStepOrder || []).flatMap(expandPlataStepToStorefront)
  const expected = CANONICAL_THREAD.length - 2
  const post = fromBackend.length === expected ? fromBackend : CANONICAL_THREAD.slice(2)
  return ['application_submission', 'merchant_decision', ...post]
}

function completedSet(paf: PostApprovalFulfillment | null): Set<string> {
  return new Set((paf?.completedWorkflowSteps || []).map((id) => normalizeWorkflowStepId(id)))
}

function hasDownloadedOfferLetter(paf: PostApprovalFulfillment | null): boolean {
  // No local download flag — once the merchant has sent the offer, treat it as available.
  return Boolean(paf?.offer?.acceptedAt || paf?.offer?.sentAt)
}

function isPostStepDone(step: CanonicalThreadStep, paf: PostApprovalFulfillment | null): boolean {
  const done = completedSet(paf)
  const status = String(paf?.status || '')
  const laterThanOffer =
    status === 'offer_accepted' ||
    status === 'appointment_scheduled' ||
    status === 'inspection_in_progress' ||
    status === 'down_payment_pending' ||
    status === 'down_payment_paid' ||
    status === 'down_payment_confirmed' ||
    status === 'contract_issued' ||
    status === 'contract_signed' ||
    status === 'disbursed'
  if (step === 'offer_letter') {
    return hasDownloadedOfferLetter(paf) || laterThanOffer
  }
  if (done.has(step)) return true
  switch (step) {
    case 'virtual_inspection':
      return isVirtualInspectionComplete(paf)
    case 'accept_offer':
      return Boolean(paf?.offer?.acceptedAt) || laterThanOffer
    case 'inspection_booking':
      return Boolean(paf?.appointment?.scheduledFor)
    case 'inspection_outcome':
      return Boolean(paf?.inspection?.completedAt && paf.inspection.outcome !== 'declined_offer')
    case 'down_payment':
      return (
        status === 'down_payment_confirmed' ||
        status === 'contract_issued' ||
        status === 'contract_signed' ||
        status === 'disbursed'
      )
    case 'contract_issued':
      return Boolean(paf?.contract?.issuedAt) || status === 'contract_signed' || status === 'disbursed'
    case 'contract_signed':
      return Boolean(paf?.contract?.signedAt) || status === 'contract_signed' || status === 'disbursed'
    case 'loan_disbursement':
      return status === 'disbursed'
    default:
      return false
  }
}

function resolveOfferLetterStorefrontStep(paf: PostApprovalFulfillment | null): MortgageWorkflowStep {
  if (paf?.offer?.acceptedAt) return 'inspection_booking'
  if (!paf?.offer?.sentAt) return 'offer_letter'
  // Download is folded into accept-offer when there is no backend download flag.
  return 'accept_offer'
}

export function resolveMortgageWorkflowStep(application: StorefrontApplication): MortgageWorkflowStep {
  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  const status = String(paf?.status || '')

  if (isMerchantRejected(application) && !isMerchantApproved(application)) {
    return 'merchant_decision'
  }
  if (!isMerchantApproved(application)) {
    return 'merchant_decision'
  }
  if (status === 'offer_declined') return 'accept_offer'
  if (status === 'inspection_declined') return 'inspection_outcome'

  const fromCurrent = canonicalizeStep(paf?.currentWorkflowStepId || '')
  if (fromCurrent === 'offer_letter') {
    return resolveOfferLetterStorefrontStep(paf)
  }
  if (fromCurrent && fromCurrent !== 'application_submission' && fromCurrent !== 'merchant_decision') {
    return fromCurrent
  }

  if (status === 'virtual_inspection_pending') return 'virtual_inspection'
  if (status === 'offer_pending') return resolveOfferLetterStorefrontStep(paf)
  if (status === 'offer_accepted') return 'inspection_booking'
  if (status === 'appointment_scheduled' || status === 'inspection_in_progress') return 'inspection_outcome'
  if (status === 'down_payment_pending' || status === 'down_payment_paid') return 'down_payment'
  if (status === 'down_payment_confirmed' || status === 'contract_issued') return 'contract_signed'
  if (status === 'contract_signed') return 'loan_disbursement'
  if (status === 'disbursed') return 'loan_disbursement'

  return 'virtual_inspection'
}

export type MortgageThreadItem = {
  step: MortgageWorkflowStep
  stepNumber: number
  title: string
  description: string
  status: 'done' | 'current' | 'upcoming' | 'rejected'
  actionLabel?: string
}

const STEP_META: Record<
  (typeof CANONICAL_THREAD)[number],
  { title: string; description: string; actionLabel?: string }
> = {
  application_submission: {
    title: 'Application Submission',
    description: 'Your application has been received. The merchant will review and respond shortly.',
  },
  merchant_decision: {
    title: 'Approved or Rejected',
    description: 'Waiting for the merchant to approve or reject your application.',
    actionLabel: undefined,
  },
  virtual_inspection: {
    title: 'Virtual Inspection',
    description: 'Explore the property location, video tour, and photos before continuing.',
    actionLabel: 'Start virtual inspection',
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
  inspection_booking: {
    title: 'Inspection Booking',
    description: 'Choose an available time slot to inspect the property in person.',
    actionLabel: 'Book inspection',
  },
  inspection_outcome: {
    title: 'Inspection Outcome',
    description: 'Confirm the physical inspection visit to continue, or decline the property.',
    actionLabel: 'Confirm inspection',
  },
  down_payment: {
    title: 'Down Payment',
    description:
      'Pay the required equity from your Central Wallet or by bank transfer to the merchant repayment account.',
    actionLabel: 'Pay down payment',
  },
  contract_issued: {
    title: 'Contract Issued',
    description: 'The merchant is issuing your mortgage contract after confirming the down payment.',
  },
  contract_signed: {
    title: 'Contract Signed',
    description: 'Download the contract, sign it, and upload the signed copy.',
    actionLabel: 'Sign contract',
  },
  loan_disbursement: {
    title: 'Loan Disbursement',
    description: 'Your mortgage allocation document is ready after the merchant disburses the loan.',
    actionLabel: 'Download allocation',
  },
}

function merchantDecisionCopy(application: StorefrontApplication): { description: string; status: MortgageThreadItem['status'] } {
  if (isMerchantRejected(application) && !isMerchantApproved(application)) {
    return {
      status: 'rejected',
      description: 'Your mortgage application was rejected.',
    }
  }
  if (isMerchantApproved(application)) {
    return {
      status: 'done',
      description: 'Your mortgage application was approved.',
    }
  }
  return {
    status: 'current',
    description: 'Waiting for the merchant to approve or reject your application.',
  }
}

export function buildMortgageThread(
  applicationOrCurrent: StorefrontApplication | MortgageWorkflowStep,
  _options?: { workflowComplete?: boolean },
): MortgageThreadItem[] {
  if (typeof applicationOrCurrent === 'string') {
    const current = canonicalizeStep(applicationOrCurrent) || applicationOrCurrent
    const order = [...CANONICAL_THREAD]
    const currentIndex = order.indexOf(current as (typeof CANONICAL_THREAD)[number])
    return order.map((step, index) => ({
      step,
      stepNumber: index + 1,
      ...STEP_META[step],
      status: currentIndex < 0 ? 'upcoming' : index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
    }))
  }

  const application = applicationOrCurrent
  const paf = extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
  const order = threadOrder(paf)
  const current = resolveMortgageWorkflowStep(application)
  const status = String(paf?.status || '')
  const approved = isMerchantApproved(application)
  const merchantRejected = isMerchantRejected(application) && !approved
  const offerSent = Boolean(paf?.offer?.sentAt)
  const offerDownloaded = hasDownloadedOfferLetter(paf)

  return order.map((step, index) => {
    const meta = STEP_META[step]
    const base: MortgageThreadItem = {
      step,
      stepNumber: index + 1,
      title: meta.title,
      description: meta.description,
      actionLabel: meta.actionLabel,
      status: 'upcoming',
    }

    if (step === 'application_submission') {
      return { ...base, status: 'done' }
    }

    if (step === 'merchant_decision') {
      const copy = merchantDecisionCopy(application)
      return { ...base, ...copy, actionLabel: undefined }
    }

    if (merchantRejected || !approved) {
      return { ...base, status: 'upcoming' }
    }

    if (step === 'accept_offer' && status === 'offer_declined') {
      return {
        ...base,
        status: 'rejected',
        description: 'Your mortgage offer was rejected.',
        actionLabel: undefined,
      }
    }
    if (step === 'inspection_outcome' && status === 'inspection_declined') {
      return {
        ...base,
        status: 'rejected',
        description: 'The property inspection was declined.',
        actionLabel: undefined,
      }
    }

    const currentIndex = order.indexOf(current as (typeof CANONICAL_THREAD)[number])
    if (currentIndex > index) {
      return { ...base, status: 'done', actionLabel: undefined }
    }

    if (isPostStepDone(step, paf)) {
      return { ...base, status: 'done', actionLabel: step === 'loan_disbursement' ? meta.actionLabel : undefined }
    }

    if (step === current) {
      let description = meta.description
      let actionLabel = meta.actionLabel
      if (step === 'offer_letter' && !offerSent) {
        description = 'Waiting for the merchant to send your offer letter.'
        actionLabel = undefined
      }
      if (step === 'offer_letter' && offerSent && !offerDownloaded) {
        description = 'Your mortgage offer letter is ready. Download and review it before accepting.'
      }
      if (step === 'accept_offer' && !offerDownloaded) {
        description = 'Download the offer letter before you accept or decline.'
        actionLabel = undefined
      }
      if (step === 'down_payment' && status === 'down_payment_paid') {
        description = 'Payment received. Waiting for the merchant to confirm before the contract is issued.'
      }
      if (step === 'loan_disbursement' && status !== 'disbursed') {
        description = 'Waiting for the merchant to disburse your mortgage.'
      }
      return { ...base, status: 'current', description, actionLabel }
    }

    return base
  })
}

export type MortgageWorkflowModal =
  | 'virtual_tour'
  | 'virtual_inspection'
  | 'offer_letter'
  | 'book_inspection'
  | 'inspection_booking'
  | 'inspection_outcome'
  | 'accept_offer'
  | 'down_payment'
  | 'contract_issued'
  | 'contract_signing'
  | 'contract_signed'
  | 'mortgage_allocation'
  | 'loan_disbursement'

export function mortgageStepToModal(step: MortgageWorkflowStep): MortgageWorkflowModal | null {
  switch (step) {
    case 'virtual_tour':
    case 'virtual_inspection':
      return 'virtual_inspection'
    case 'offer_letter':
      return 'offer_letter'
    case 'accept_offer':
      return 'accept_offer'
    case 'book_inspection':
    case 'inspection_booking':
      return 'inspection_booking'
    case 'inspection_outcome':
      return 'inspection_outcome'
    case 'down_payment':
      return 'down_payment'
    case 'contract_issued':
      return 'contract_issued'
    case 'contract_signing':
    case 'contract_signed':
      return 'contract_signed'
    case 'mortgage_allocation':
    case 'loan_disbursement':
      return 'loan_disbursement'
    default:
      return null
  }
}

export function mortgageStepCta(
  step: MortgageWorkflowStep,
  productId: string,
  applicationId: string,
  application?: StorefrontApplication,
): { label: string; href: string; modal?: MortgageWorkflowModal } | null {
  const base = `/mobile-v2/products/mortgage`
  const pendingHref = `${base}/pending/${encodeURIComponent(applicationId)}`
  const q = `productId=${encodeURIComponent(productId)}&applicationId=${encodeURIComponent(applicationId)}`
  const canonical = canonicalizeStep(step) || step
  const paf = application
    ? extractPostApprovalFulfillment(application as unknown as Record<string, unknown>)
    : null

  switch (canonical) {
    case 'application_submission':
      return {
        label: 'Continue application',
        href: `${base}/apply?${q}`,
      }
    case 'merchant_decision':
      return null
    case 'virtual_inspection':
      return {
        label: STEP_META.virtual_inspection.actionLabel ?? 'Start virtual inspection',
        href: `${pendingHref}?action=virtual_inspection`,
        modal: 'virtual_inspection',
      }
    case 'offer_letter':
      if (!paf?.offer?.sentAt) return null
      return {
        label: STEP_META.offer_letter.actionLabel ?? 'Download offer letter',
        href: `${pendingHref}?action=offer_letter`,
        modal: 'offer_letter',
      }
    case 'accept_offer':
      if (!hasDownloadedOfferLetter(paf)) {
        return null
      }
      return {
        label: STEP_META.accept_offer.actionLabel ?? 'Accept offer',
        href: `${pendingHref}?action=accept_offer`,
        modal: 'accept_offer',
      }
    case 'inspection_booking':
      return {
        label: STEP_META.inspection_booking.actionLabel ?? 'Book inspection',
        href: `${pendingHref}?action=inspection_booking`,
        modal: 'inspection_booking',
      }
    case 'inspection_outcome':
      return {
        label: STEP_META.inspection_outcome.actionLabel ?? 'Confirm inspection',
        href: `${pendingHref}?action=inspection_outcome`,
        modal: 'inspection_outcome',
      }
    case 'down_payment':
      return {
        label: STEP_META.down_payment.actionLabel ?? 'Make payment',
        href: `${pendingHref}?action=down_payment`,
        modal: 'down_payment',
      }
    case 'contract_issued':
      return null
    case 'contract_signed':
      return {
        label: STEP_META.contract_signed.actionLabel ?? 'Sign contract',
        href: `${pendingHref}?action=contract_signed`,
        modal: 'contract_signed',
      }
    case 'loan_disbursement':
      if (paf?.status === 'disbursed') {
        return {
          label: STEP_META.loan_disbursement.actionLabel ?? 'Download allocation',
          href: `${pendingHref}?action=loan_disbursement`,
          modal: 'loan_disbursement',
        }
      }
      return null
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
