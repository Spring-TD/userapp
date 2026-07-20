'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PendingApplicationsListSkeleton } from '@/components/mobile-v2/data-skeletons'
import { fetchUserApplications, type StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  buildMortgageThread,
  mortgageStepCta,
  readMortgageWorkflow,
  resolveMortgageWorkflowStep,
} from '@/lib/mortgageWorkflow'
import {
  loanNextStepLabel,
  loanStepCta,
  readLoanWorkflow,
  resolveLoanWorkflowStep,
} from '@/lib/loanWorkflow'
import { mortgagePendingDetailHref } from '@/lib/mortgageApplyRoutes'
import { loanPendingDetailHref } from '@/lib/loanApplyRoutes'

type PendingKind = 'loan' | 'mortgage'
type PendingScreenKind = PendingKind | 'all'

const PENDING_WORKFLOW_STATUSES = new Set(['account_created', 'requested', 'under_review', 'pending'])

function applicationPendingKind(application: StorefrontApplication): PendingKind | null {
  const type = String(application.productType || '').toUpperCase()
  if (type === 'LOAN') return 'loan'
  if (type === 'MORTGAGE') return 'mortgage'
  return null
}

function isPendingApplication(application: StorefrontApplication, kind: PendingKind) {
  const status = String(application.status || '').toLowerCase()
  const workflowStatus = String(application.loanWorkflowStatus || '').toLowerCase()
  const applicationId = String(application.id ?? application._id ?? '')

  if (kind === 'mortgage') {
    const local = readMortgageWorkflow(applicationId)
    const step = resolveMortgageWorkflowStep(application, local)
    if (local?.allocationDownloaded) return false
    if (step !== 'mortgage_allocation' && step !== 'declined') return true
  }

  if (kind === 'loan') {
    const local = readLoanWorkflow(applicationId)
    const step = resolveLoanWorkflowStep(application, local)
    if (local?.offerDeclined) return false
    if (step === 'loan_disbursed' && local?.disbursementSeen) return false
    if (step !== 'declined') return true
  }

  return status === 'pending' || PENDING_WORKFLOW_STATUSES.has(workflowStatus)
}

function formatAmount(application: StorefrontApplication) {
  const amount = application.amount
  const currency = application.currency || 'NGN'
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currency}0.00`
  return `${currency}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function titleFor(application: StorefrontApplication, kind: PendingKind) {
  return application.productName || (kind === 'loan' ? 'Loan Request' : 'Mortgage Request')
}

function mortgageNextStepLabel(application: StorefrontApplication) {
  const applicationId = String(application.id ?? application._id ?? '')
  const local = readMortgageWorkflow(applicationId)
  const step = resolveMortgageWorkflowStep(application, local)
  const thread = buildMortgageThread(step)
  const current = thread.find((item) => item.status === 'current')
  return current?.title ?? 'In progress'
}

export function PendingProductApplicationsScreen({ kind }: { kind: PendingScreenKind }) {
  const [applications, setApplications] = useState<StorefrontApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const backHref =
    kind === 'loan'
      ? '/mobile-v2/products/loan'
      : kind === 'mortgage'
        ? '/mobile-v2/products/mortgage'
        : '/mobile-v2/home'
  const title =
    kind === 'loan' ? 'My Loan' : kind === 'mortgage' ? 'Pending Mortgage' : 'Pending applications'
  const emptyLabel = kind === 'all' ? 'applications' : `${kind} applications`

  useEffect(() => {
    let cancelled = false

    async function loadApplications() {
      setLoading(true)
      setError(null)
      const result = await fetchUserApplications()
      if (cancelled) return

      if (!result.ok) {
        setApplications([])
        setError(result.error)
      } else {
        setApplications(result.applications)
      }
      setLoading(false)
    }

    void loadApplications()

    return () => {
      cancelled = true
    }
  }, [])

  const pendingApplications = useMemo(
    () =>
      applications
        .filter((application) => {
          const appKind = applicationPendingKind(application)
          if (!appKind) return false
          if (kind !== 'all' && appKind !== kind) return false
          return isPendingApplication(application, appKind)
        })
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
    [applications, kind],
  )

  return (
    <div className="flex h-full flex-col sf-page-bg-tint">
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-12 no-scrollbar">
        <div className="mb-4 grid grid-cols-3 items-center">
          <Link href={backHref} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-medium text-gray-950 whitespace-nowrap">{title}</h1>
          <div />
        </div>

        <div className="rounded-lg bg-white px-4 pb-4 pt-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="mx-auto mb-7 h-1.5 w-12 rounded-full bg-gray-200" />

          {loading ? (
            <PendingApplicationsListSkeleton />
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{error}</div>
          ) : pendingApplications.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-900">No pending {emptyLabel}</p>
              <p className="mt-1 text-xs text-gray-500">Pending applications will appear here once you start an application.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApplications.map((application) => {
                const applicationId = String(application.id ?? application._id ?? '')
                const productId = String(application.productId ?? '')
                const appKind = applicationPendingKind(application)
                if (!appKind) return null
                const mortgageLocal = readMortgageWorkflow(applicationId)
                const loanLocal = readLoanWorkflow(applicationId)
                const mortgageStep =
                  appKind === 'mortgage' ? resolveMortgageWorkflowStep(application, mortgageLocal) : null
                const loanStep = appKind === 'loan' ? resolveLoanWorkflowStep(application, loanLocal) : null
                const mortgageCta =
                  appKind === 'mortgage' && productId && applicationId && mortgageStep
                    ? mortgageStepCta(mortgageStep, productId, applicationId)
                    : null
                const loanCta =
                  appKind === 'loan' && applicationId && loanStep ? loanStepCta(loanStep, applicationId) : null
                const cta = appKind === 'mortgage' ? mortgageCta : loanCta
                const detailHref =
                  appKind === 'mortgage' && applicationId
                    ? mortgagePendingDetailHref(applicationId)
                    : appKind === 'loan' && applicationId
                      ? loanPendingDetailHref(applicationId)
                      : null
                const nextStepLabel =
                  appKind === 'mortgage'
                    ? mortgageNextStepLabel(application)
                    : loanNextStepLabel(application)

                return (
                  <div
                    key={applicationId}
                    className="rounded-xl bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-medium text-gray-950">{titleFor(application, appKind)}</h2>
                        {kind === 'all' ? (
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            {appKind}
                          </p>
                        ) : null}
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--sf-button,#1E40AF)]">
                          Next: {nextStepLabel}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-950">{formatAmount(application)}</p>
                        <p className="mt-2 text-[10px] text-gray-400">{formatDate(application.createdAt || application.updatedAt)}</p>
                      </div>
                    </div>

                    {detailHref ? (
                      <div className="mt-4 flex gap-2">
                        <Link
                          href={detailHref}
                          className="flex flex-1 items-center justify-center gap-1 rounded-full border border-gray-200 py-2.5 text-xs font-semibold text-gray-700"
                        >
                          View details
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                        {cta ? (
                          <Link
                            href={cta.href}
                            className="flex flex-1 items-center justify-center rounded-full bg-[var(--sf-button,#1E40AF)] py-2.5 text-xs font-semibold text-white"
                          >
                            {cta.label}
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
