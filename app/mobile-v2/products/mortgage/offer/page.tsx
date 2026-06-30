'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import {
  MortgageOfferFlow,
  type MortgageOfferFlowStep,
} from '@/components/mobile-v2/mortgage/MortgageOfferFlow'
import { MortgageDetailSkeleton } from '@/components/mobile-v2/data-skeletons'
import { mortgagePendingDetailHref } from '@/lib/mortgageApplyRoutes'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { poweredBy } from '@/lib/mobileProductDetailDisplay'

function parseInitialStep(value: string | null): MortgageOfferFlowStep {
  switch (value) {
    case 'schedule_inspection':
    case 'inspection':
    case 'down_payment':
    case 'contract':
      return value
    default:
      return 'schedule_inspection'
  }
}

function OfferPageContent() {
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))
  const applicationId = searchParams.get('applicationId')?.trim() || undefined
  const initialStep = parseInitialStep(searchParams.get('step'))
  const { ready: tenantReady, displayName } = useMobileV2Tenant()
  const { product, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  if (!productId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">Missing product.</p>
        <Link href="/mobile-v2/products/mortgage/pending" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]">
          Pending mortgage
        </Link>
      </div>
    )
  }

  if (!tenantReady || loading) {
    return (
      <div className="sf-page-bg px-4 pt-10">
        <MortgageDetailSkeleton />
      </div>
    )
  }

  const provider = poweredBy(displayName || undefined)
  const property = product?.properties?.[0]
  const backHref = applicationId
    ? mortgagePendingDetailHref(applicationId)
    : `/mobile-v2/products/mortgage/${encodeURIComponent(productId)}?tab=details`

  return (
    <MortgageOfferFlow
      productId={productId}
      applicationId={applicationId}
      productName={product?.name || property?.name || 'Mortgage property'}
      provider={provider}
      propertyValue={property?.value ?? product?.propertyValue ?? product?.amountMax ?? null}
      downPaymentPercent={product?.equityContribution ?? 10}
      backHref={backHref}
      initialStep={initialStep}
    />
  )
}

export default function MortgageOfferPage() {
  return (
    <Suspense
      fallback={
        <div className="sf-page-bg px-4 pt-10">
          <MortgageDetailSkeleton />
        </div>
      }
    >
      <OfferPageContent />
    </Suspense>
  )
}
