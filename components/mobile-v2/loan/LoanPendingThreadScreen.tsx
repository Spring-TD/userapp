'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoanWorkflowModals } from '@/components/mobile-v2/loan/LoanWorkflowModals'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  buildLoanThread,
  loanStepCta,
  loanStepToModal,
  patchLoanWorkflow,
  readLoanWorkflow,
  resolveLoanWorkflowStep,
  type LoanThreadItem,
  type LoanWorkflowModal,
  type LoanWorkflowStep,
} from '@/lib/loanWorkflow'
import { cn } from '@/lib/utils'

function formatAmount(application: StorefrontApplication) {
  const amount = application.amount
  const currency = application.currency || 'NGN'
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currency}0.00`
  return `${currency}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ThreadRow({
  item,
  onAction,
}: {
  item: LoanThreadItem
  onAction?: () => void
}) {
  const isClickable = item.status === 'current' && Boolean(onAction)

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onAction?.()}
      className={cn(
        'flex w-full gap-3 text-left',
        isClickable && 'cursor-pointer rounded-xl transition hover:bg-gray-50/80',
        !isClickable && 'cursor-default',
      )}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
            item.status === 'done'
              ? 'border-green-500 bg-green-500 text-white'
              : item.status === 'current'
                ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                : 'border-gray-200 bg-white text-gray-400',
          )}
        >
          {item.status === 'done' ? <Check className="h-3.5 w-3.5" /> : item.stepNumber}
        </div>
        <div className="mt-1 w-px flex-1 bg-gray-200 last:hidden" />
      </div>
      <div className={cn('min-w-0 flex-1 pb-6', item.status === 'upcoming' && 'opacity-50')}>
        <p
          className={cn(
            'text-sm font-semibold',
            item.status === 'current' ? 'text-[var(--sf-button,#1E40AF)]' : 'text-[var(--sf-ink,#1E293B)]',
          )}
        >
          {item.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
        {item.status === 'current' ? (
          <span className="mt-2 inline-block rounded-full sf-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sf-button,#1E40AF)]">
            {isClickable ? 'Tap to continue' : 'In progress'}
          </span>
        ) : null}
        {item.status === 'current' && item.actionLabel && isClickable ? (
          <span className="mt-2 block text-[11px] font-semibold text-[var(--sf-button,#1E40AF)]">
            {item.actionLabel}
          </span>
        ) : null}
      </div>
    </button>
  )
}

type LoanPendingThreadScreenProps = {
  application: StorefrontApplication
  backHref?: string
  /** When true, render only the workflow (no page chrome / duplicate summary). */
  embedded?: boolean
}

export function LoanPendingThreadScreen({
  application,
  backHref = '/mobile-v2/products/loan/pending',
  embedded = false,
}: LoanPendingThreadScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { displayName } = useMobileV2Tenant()
  const applicationId = String(application.id ?? application._id ?? '')
  const productId = String(application.productId ?? '')
  const [workflowVersion, setWorkflowVersion] = useState(0)
  const [activeModal, setActiveModal] = useState<LoanWorkflowModal | null>(null)

  const { product } = useMobileProductDetail({
    productId,
    enabled: Boolean(productId),
  })

  const local = readLoanWorkflow(applicationId)
  const currentStep = resolveLoanWorkflowStep(application, local)
  const thread = buildLoanThread(currentStep, {
    workflowComplete: currentStep === 'loan_disbursed' && Boolean(local?.disbursementSeen),
  })
  const cta = applicationId ? loanStepCta(currentStep, applicationId) : null

  const refreshWorkflow = useCallback(() => {
    setWorkflowVersion((value) => value + 1)
  }, [])

  const openStepModal = useCallback(
    (step: LoanWorkflowStep = currentStep) => {
      if (step === 'loan_disbursed') {
        patchLoanWorkflow(applicationId, { disbursementSeen: true })
        refreshWorkflow()
        router.push('/mobile-v2/accounts')
        return
      }
      const modal = loanStepToModal(step)
      if (modal) setActiveModal(modal)
    },
    [applicationId, currentStep, refreshWorkflow, router],
  )

  useEffect(() => {
    if (embedded) return
    const action = searchParams.get('action') as LoanWorkflowModal | null
    if (!action) return
    setActiveModal(action)
    router.replace(`/mobile-v2/products/loan/pending/${encodeURIComponent(applicationId)}`, {
      scroll: false,
    })
  }, [applicationId, embedded, router, searchParams])

  const handleCta = () => {
    if (!cta) return
    if (cta.modal) {
      openStepModal(currentStep)
      return
    }
    if (currentStep === 'loan_disbursed') {
      openStepModal('loan_disbursed')
      return
    }
    router.push(cta.href)
  }

  const workflowCard = (
    <div className="rounded-2xl border sf-border-subtle bg-white px-4 py-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Workflow</p>
      <p className="mb-4 text-xs text-gray-500">
        Follow each step below. Tap the current step to continue.
      </p>
      {thread.map((item) => (
        <ThreadRow
          key={item.step}
          item={item}
          onAction={
            item.status === 'current' && cta
              ? () => openStepModal(item.step)
              : undefined
          }
        />
      ))}
      {embedded && cta ? (
        <Button
          className="mt-2 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
          onClick={handleCta}
        >
          {cta.label}
        </Button>
      ) : null}
    </div>
  )

  if (embedded) {
    return (
      <div key={workflowVersion}>
        {workflowCard}
        <LoanWorkflowModals
          active={activeModal}
          onClose={() => setActiveModal(null)}
          application={application}
          applicationId={applicationId}
          product={product}
          providerName={displayName || undefined}
          onStepAdvanced={refreshWorkflow}
        />
      </div>
    )
  }

  return (
    <div className="relative flex min-h-full flex-col sf-page-bg-tint" key={workflowVersion}>
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-12 no-scrollbar">
        <div className="mb-6 grid grid-cols-3 items-center">
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-bold text-gray-950 whitespace-nowrap">Pending Loan</h1>
          <div />
        </div>

        <div className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Application</p>
          <h2 className="mt-1 text-base font-bold text-[var(--sf-ink,#1E293B)]">
            {application.productName || product?.name || 'Loan application'}
          </h2>
          <p className="mt-2 text-lg font-bold text-[var(--sf-button,#1E40AF)]">{formatAmount(application)}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-500">
            {String(application.status || application.loanWorkflowStatus || 'Pending').replace(/_/g, ' ')}
          </p>
        </div>

        {workflowCard}
      </div>

      {cta ? (
        <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
            onClick={handleCta}
          >
            {cta.label}
          </Button>
        </div>
      ) : null}

      <LoanWorkflowModals
        active={activeModal}
        onClose={() => setActiveModal(null)}
        application={application}
        applicationId={applicationId}
        product={product}
        providerName={displayName || undefined}
        onStepAdvanced={refreshWorkflow}
      />
    </div>
  )
}
