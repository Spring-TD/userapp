'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchUserApplications, type StorefrontApplication } from '@/lib/storefrontApplicationClient'

type PendingKind = 'loan' | 'mortgage'

const PENDING_WORKFLOW_STATUSES = new Set(['account_created', 'requested', 'under_review', 'pending'])

function isPendingApplication(application: StorefrontApplication) {
  const status = String(application.status || '').toLowerCase()
  const workflowStatus = String(application.loanWorkflowStatus || '').toLowerCase()
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

function displayStatus(application: StorefrontApplication) {
  const workflowStatus = String(application.loanWorkflowStatus || '').toLowerCase()
  const status = String(application.status || 'pending').toLowerCase()
  if (workflowStatus === 'approved' || status === 'approved' || status === 'completed') {
    return { label: 'Completed', className: 'text-green-500' }
  }
  if (workflowStatus === 'declined' || status === 'rejected' || status === 'failed') {
    return { label: 'Unsuccessful', className: 'text-red-500' }
  }
  return { label: 'Pending', className: 'text-orange-400' }
}

function titleFor(application: StorefrontApplication, kind: PendingKind) {
  return application.productName || (kind === 'loan' ? 'Loan Request' : 'Mortgage Request')
}

export function PendingProductApplicationsScreen({ kind }: { kind: PendingKind }) {
  const [applications, setApplications] = useState<StorefrontApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const productType = kind === 'loan' ? 'LOAN' : 'MORTGAGE'
  const backHref = kind === 'loan' ? '/mobile-v2/products/loan' : '/mobile-v2/products/mortgage'
  const title = kind === 'loan' ? 'My Loan' : 'My Mortgage'

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
        .filter((application) => String(application.productType || '').toUpperCase() === productType)
        .filter(isPendingApplication)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()),
    [applications, productType],
  )

  return (
    <div className="flex h-full flex-col bg-[#F5F7FF]">
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-12 no-scrollbar">
        <div className="mb-7 grid grid-cols-3 items-center">
          <Link href={backHref} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-medium text-gray-950">{title}</h1>
          <div />
        </div>

        <div className="rounded-lg bg-white px-4 pb-4 pt-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="mx-auto mb-7 h-1.5 w-12 rounded-full bg-gray-200" />

          {loading ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--sf-button,#1E40AF)]" />
              Loading pending {kind} applications...
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-6 text-center text-sm text-red-600">{error}</div>
          ) : pendingApplications.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-900">No pending {kind} applications</p>
              <p className="mt-1 text-xs text-gray-500">Pending applications will appear here once you start an application.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApplications.map((application) => {
                const status = displayStatus(application)
                return (
                  <div key={application.id || application._id} className="rounded-xl bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-medium text-gray-950">{titleFor(application, kind)}</h2>
                        <p className={`mt-2 text-[10px] ${status.className}`}>{status.label}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-950">{formatAmount(application)}</p>
                        <p className="mt-2 text-[10px] text-gray-400">{formatDate(application.createdAt || application.updatedAt)}</p>
                      </div>
                    </div>
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
