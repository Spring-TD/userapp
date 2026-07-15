'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PendingApplicationThreadSkeleton } from '@/components/mobile-v2/data-skeletons'
import { MortgagePendingThreadScreen } from '@/components/mobile-v2/mortgage/MortgagePendingThreadScreen'
import { fetchUserApplications, type StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { initMortgageWorkflowSubmitted, readMortgageWorkflow } from '@/lib/mortgageWorkflow'

function PendingDetailContent() {
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
    if (readMortgageWorkflow(applicationId)) return
    initMortgageWorkflowSubmitted(
      applicationId,
      String(application.productId ?? ''),
      'equity_contribution',
    )
  }, [application, applicationId])

  if (loading) {
    return <PendingApplicationThreadSkeleton title="Pending Mortgage" />
  }

  if (error || !application) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg-tint px-6 text-center">
        <p className="text-sm text-gray-600">{error || 'Application not found.'}</p>
        <Link href="/mobile-v2/products/mortgage/pending" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]">
          Back to pending list
        </Link>
      </div>
    )
  }

  return <MortgagePendingThreadScreen application={application} />
}

export default function MortgagePendingDetailPage() {
  return (
    <Suspense fallback={<PendingApplicationThreadSkeleton title="Pending Mortgage" />}>
      <PendingDetailContent />
    </Suspense>
  )
}
