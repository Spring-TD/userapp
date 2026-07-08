'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  buildMortgageThread,
  mortgageStepCta,
  readMortgageWorkflow,
  resolveMortgageWorkflowStep,
  type MortgageThreadItem,
} from '@/lib/mortgageWorkflow'
import { cn } from '@/lib/utils'

function formatAmount(application: StorefrontApplication) {
  const amount = application.amount
  const currency = application.currency || 'NGN'
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currency}0.00`
  return `${currency}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ThreadRow({
  item,
  onNavigate,
}: {
  item: MortgageThreadItem
  onNavigate?: () => void
}) {
  const isClickable = item.status === 'current' && Boolean(onNavigate)

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onNavigate?.()}
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
      </div>
    </button>
  )
}

type MortgagePendingThreadScreenProps = {
  application: StorefrontApplication
  backHref?: string
}

export function MortgagePendingThreadScreen({
  application,
  backHref = '/mobile-v2/products/mortgage/pending',
}: MortgagePendingThreadScreenProps) {
  const router = useRouter()
  const applicationId = String(application.id ?? application._id ?? '')
  const productId = String(application.productId ?? '')
  const local = readMortgageWorkflow(applicationId)
  const currentStep = resolveMortgageWorkflowStep(application, local)
  const thread = buildMortgageThread(currentStep)
  const cta = productId && applicationId ? mortgageStepCta(currentStep, productId, applicationId) : null

  const navigateCurrentStep = cta?.href
    ? () => {
        router.push(cta.href)
      }
    : undefined

  return (
    <div className="flex min-h-full flex-col sf-page-bg-tint">
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-12 no-scrollbar">
        <div className="mb-6 grid grid-cols-3 items-center">
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-bold text-gray-950">Pending Mortgage</h1>
          <div />
        </div>

        <div className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Application</p>
          <h2 className="mt-1 text-base font-bold text-[var(--sf-ink,#1E293B)]">
            {application.productName || 'Mortgage application'}
          </h2>
          <p className="mt-2 text-lg font-bold text-[var(--sf-button,#1E40AF)]">{formatAmount(application)}</p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Workflow</p>
          <p className="mb-4 text-xs text-gray-500">
            Follow each step below. Tap the current step to continue.
          </p>
          {thread.map((item) => (
            <ThreadRow
              key={item.step}
              item={item}
              onNavigate={item.status === 'current' ? navigateCurrentStep : undefined}
            />
          ))}
        </div>
      </div>

      {cta ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:left-1/2 md:w-[400px] md:-translate-x-1/2">
          <Button
            className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
            onClick={() => router.push(cta.href)}
          >
            {cta.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
