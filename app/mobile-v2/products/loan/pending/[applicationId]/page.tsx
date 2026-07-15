'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PendingApplicationThreadSkeleton } from '@/components/mobile-v2/data-skeletons'
import { LoanPendingThreadScreen } from '@/components/mobile-v2/loan/LoanPendingThreadScreen'
import { fetchUserApplications, type StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { initLoanWorkflowSubmitted, readLoanWorkflow } from '@/lib/loanWorkflow'

function PendingLoanDetailContent() {
  const params = useParams()
  const applicationId = typeof params?.applicationId === 'string' ? params.applicationId : ''
  const [application, setApplication] = useState<StorefrontApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchUserApplications().then((result) => {
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
      if (!match) setError('Application not found.')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [applicationId])

  useEffect(() => {
    if (!application || !applicationId) return
    if (readLoanWorkflow(applicationId)) return
    initLoanWorkflowSubmitted(applicationId, String(application.productId ?? ''))
  }, [application, applicationId])

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

  return <LoanPendingThreadScreen application={application} />
}

export default function LoanPendingDetailPage() {
  return (
    <Suspense fallback={<PendingApplicationThreadSkeleton title="Pending Loan" />}>
      <PendingLoanDetailContent />
    </Suspense>
  )
}
