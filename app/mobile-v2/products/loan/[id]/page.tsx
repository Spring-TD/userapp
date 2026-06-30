'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { mapMobileProductToLoanCatalog } from '@/lib/mapProductToLoanCatalog'
import { poweredBy } from '@/lib/mobileProductDetailDisplay'
import { loanApplyStartHref } from '@/lib/loanApplyRoutes'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import type { LoanCatalogItem } from '@/types/loanCatalog'
import { ProductDetailsScreen } from '@/components/mobile-v2/application/ProductDetailsScreen'
import { amountRange, feeSummary, formatNgn, requirementSummary } from '@/lib/mobileProductDetailDisplay'

function LoanDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawId = params?.id
  const productId = typeof rawId === 'string' ? sanitizeProductId(decodeURIComponent(rawId)) : ''
  const detailsOnly = searchParams.get('tab') === 'details'
  const initialTab = detailsOnly ? 'product' : 'history'

  const { ready: tenantReady, displayName } = useMobileV2Tenant()
  const { product, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  const loan = useMemo<LoanCatalogItem | undefined>(() => {
    if (!productId) return undefined
    if (product) return mapMobileProductToLoanCatalog(product, poweredBy(displayName || undefined))
    return undefined
  }, [displayName, product, productId])

  if (!tenantReady || loading) {
    return (
      <div className="flex h-full flex-col sf-page-bg">
        <div className="sticky top-0 z-20 bg-white px-4 pb-3 pt-10 shadow-sm">
          <Skeleton className="mb-3 h-10 w-10 rounded-full bg-gray-200/90" />
          <Skeleton className="h-12 w-full rounded-full bg-gray-200/90" />
        </div>
        <MobileV2ProductListSkeleton />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">This loan product could not be found.</p>
        <Link href="/mobile-v2/products/loan">
          <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
            Back to loans
          </Button>
        </Link>
      </div>
    )
  }

  const imageUrl =
    loan.imageUrl ||
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop'

  return (
    <div className="flex h-full min-h-0 flex-col">
    <ProductDetailsScreen
      key={productId}
      kind="loan"
      productId={productId}
      initialTab={initialTab}
      detailsOnly={detailsOnly}
      title={loan.title}
      amount={loan.amountDisplay}
      description={loan.description}
      duration={loan.duration}
      rate={loan.interestRate}
      provider={loan.providerName}
      imageUrl={imageUrl}
      applyHref={loanApplyStartHref(loan.id)}
      backHref="/mobile-v2/products/loan"
      detailRows={
        product
          ? [
              { label: 'Loan type', value: product.subType || product.name },
              ...(product.amountMin != null && product.amountMax != null
                ? [
                    { label: 'Minimum amount', value: formatNgn(product.amountMin) },
                    { label: 'Maximum amount', value: formatNgn(product.amountMax) },
                  ]
                : [{ label: 'Amount', value: amountRange(product) }]),
              { label: 'Loan Tenure', value: product.duration || loan.duration },
              { label: 'Repayment Frequency', value: product.repaymentFrequency || 'Not specified' },
              { label: 'Collateral', value: requirementSummary(product) },
              { label: 'Fees & charges', value: feeSummary(product) },
              { label: 'Interest Rate', value: loan.interestRate },
              { label: 'Interest Method', value: product.interestMethod || 'Not specified' },
              { label: 'Powered by:', value: loan.providerName },
            ]
          : undefined
      }
    />
    </div>
  )
}

export default function LoanDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] sf-page-bg px-4 pt-10">
          <MobileV2ProductListSkeleton />
        </div>
      }
    >
      <LoanDetailInner />
    </Suspense>
  )
}
