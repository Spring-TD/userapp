'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { getDummyLoanById } from '@/lib/loanCatalogDummy'
import { mapMobileProductToLoanCatalog } from '@/lib/mapProductToLoanCatalog'
import { loanApplyStartHref } from '@/lib/loanApplyRoutes'
import type { LoanCatalogItem } from '@/types/loanCatalog'
import { ProductDetailsScreen } from '@/components/mobile-v2/application/ProductDetailsScreen'

function LoanDetailInner() {
  const params = useParams()
  const rawId = params?.id
  const productId = typeof rawId === 'string' ? decodeURIComponent(rawId) : ''

  const { appId, ready: tenantReady } = useMobileV2Tenant()
  const { loading, getProductById } = useMobileProducts({
    type: 'Loan',
    springAppId: appId ?? undefined,
    autoFetch: true,
    tenantReady,
  })

  const loan = useMemo<LoanCatalogItem | undefined>(() => {
    if (!productId) return undefined
    const apiProduct = getProductById(productId)
    if (apiProduct) return mapMobileProductToLoanCatalog(apiProduct)
    return getDummyLoanById(productId)
  }, [getProductById, productId])

  if (!tenantReady || loading) {
    return (
      <div className="flex h-full flex-col bg-[#FAFAFA]">
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center">
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
      title={loan.title}
      amount={loan.amountDisplay}
      description={loan.description}
      duration={loan.duration}
      rate={loan.interestRate}
      provider={loan.providerName}
      imageUrl={imageUrl}
      applyHref={loanApplyStartHref(loan.id)}
      backHref="/mobile-v2/products/loan"
    />
    </div>
  )
}

export default function LoanDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-[#FAFAFA] px-4 pt-10">
          <MobileV2ProductListSkeleton />
        </div>
      }
    >
      <LoanDetailInner />
    </Suspense>
  )
}
