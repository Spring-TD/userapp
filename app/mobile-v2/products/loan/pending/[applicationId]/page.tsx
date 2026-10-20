'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { PendingApplicationThreadSkeleton } from '@/components/mobile-v2/data-skeletons'
import { LoanPendingThreadScreen } from '@/components/mobile-v2/loan/LoanPendingThreadScreen'
import {
  canShowPendingPage,
  fetchApplicationById,
  fetchUserApplications,
  needsFinalApplicationSubmit,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { loanApplyHref } from '@/lib/loanApplyRoutes'

function PendingLoanDetailContent() {
  const router = useRouter()
  const params = useParams()
  const applicationId = typeof params?.applicationId === 'string' ? params.applicationId : ''
  const [application, setApplication] = useState<StorefrontApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchApplicationById(applicationId).then(async (byId) => {
      if (cancelled) return
      if (byId.ok && byId.application && String(byId.application.id ?? byId.application._id ?? '') === applicationId) {
        setApplication(byId.application)
        setLoading(false)
        return
      }
      const result = await fetchUserApplications()
      if (cancelled) return
      if (!result.ok) {
        setError(result.error)
        setLoading(false)
        return
      }
      const match = result.applications.find(
        (item) => String(item.id ?? item._id ?? '') === applicationId,
      )
      setApplication(match ?? null)
      if (!match) setError(byId.ok ? 'Application not found.' : byId.error || 'Application not found.')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [applicationId])

  useEffect(() => {
    if (!application || !applicationId) return
    if (needsFinalApplicationSubmit(application) || !canShowPendingPage(application)) {
      const productId = String(application.productId || '').trim()
      if (productId) {
        router.replace(`${loanApplyHref(productId)}&applicationId=${encodeURIComponent(applicationId)}`)
      } else {
        router.replace('/mobile-v2/products/loan/pending')
      }
      return
    }
  }, [application, applicationId, router])

  if (loading) {
    return <PendingApplicationThreadSkeleton title="Pending Loan" />
  }

  if (error || !application) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg-tint px-6 text-center">
        <p className="text-sm text-gray-600">{error || 'Application not found.'}</p>
        <Link href="/mobile-v2/products/loan/pending" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]">
          Back to my loans
        </Link>
      </div>
    )
  }

  if (needsFinalApplicationSubmit(application) || !canShowPendingPage(application)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg-tint px-6 text-center">
        <p className="text-sm text-gray-600">
          This application still needs to be submitted for review before the pending workflow is available.
        </p>
        <Link
          href={
            application.productId
              ? `${loanApplyHref(String(application.productId))}&applicationId=${encodeURIComponent(applicationId)}`
              : '/mobile-v2/products/loan/pending'
          }
          className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]"
        >
          Continue application
        </Link>
      </div>
    )
  }

  return <LoanPendingThreadScreen application={application} />
}

export default function LoanPendingDetailPage() {
  return (
    <Suspense fallback={<PendingApplicationThreadSkeleton title="Pending Loan" />}>
      <PendingLoanDetailContent />
    </Suspense>
  )
}
