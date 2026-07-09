'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { LoanApplicationDetailsScreen } from '@/components/mobile-v2/loan/LoanApplicationDetailsScreen'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { fetchUserApplications, type StorefrontApplication } from '@/lib/storefrontApplicationClient'

function PendingLoanDetailContent() {
  const params = useParams()
  const applicationId = typeof params?.applicationId === 'string' ? params.applicationId : ''
  const { ready: tenantReady, displayName } = useMobileV2Tenant()
  const [application, setApplication] = useState<StorefrontApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const productId = String(application?.productId ?? '')
  const { product } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center sf-page-bg-tint">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
      </div>
    )
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

  return (
    <LoanApplicationDetailsScreen
      application={application}
      product={product}
      providerName={displayName || undefined}
    />
  )
}

export default function LoanPendingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center sf-page-bg-tint text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <PendingLoanDetailContent />
    </Suspense>
  )
}
