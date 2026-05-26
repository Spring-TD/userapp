'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MortgageDetailSkeleton } from '@/components/mobile-v2/data-skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { mortgageApplyStartHref } from '@/lib/mortgageApplyRoutes'
import {
  DUMMY_FEATURED_MORTGAGE,
  DUMMY_HOT_MORTGAGES,
} from '@/lib/mortgageCatalogDummy'
import { ProductDetailsScreen } from '@/components/mobile-v2/application/ProductDetailsScreen'
import { amountRange, feeSummary, formatNgn, rateLabel, requirementSummary } from '@/lib/mobileProductDetailDisplay'

const DUMMY_MORTGAGE_BY_ID = [DUMMY_FEATURED_MORTGAGE, ...DUMMY_HOT_MORTGAGES].reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<string, (typeof DUMMY_FEATURED_MORTGAGE)>,
)

function MortgageDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawId = params?.id
  const productId = typeof rawId === 'string' ? decodeURIComponent(rawId) : ''
  const detailsOnly = searchParams.get('tab') === 'details'
  const initialTab = detailsOnly ? 'product' : 'history'

  const { ready: tenantReady } = useMobileV2Tenant()
  const { product: detailProduct, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  const product = useMemo(() => {
    if (!productId) return undefined
    return detailProduct ?? DUMMY_MORTGAGE_BY_ID[productId]
  }, [detailProduct, productId])

  const lender = 'AG Mortgage Bank'
  const imageUrl =
    product?.image ||
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop'

  if (!tenantReady || loading) {
    return (
      <div className="flex h-full flex-col bg-[#FAFAFA]" aria-busy="true" aria-live="polite">
        <div className="sticky top-0 z-20 bg-white px-4 pb-3 pt-10 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md bg-gray-200/90" />
          </div>
          <Skeleton className="h-12 w-full rounded-full bg-gray-200/90" />
        </div>
        <MortgageDetailSkeleton />
      </div>
    )
  }

  // if (!product) {
  //   return (
  //     <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center">
  //       <p className="text-sm text-gray-600">Product not found.</p>
  //       <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white" onClick={() => router.push('/mobile-v2/products/mortgage')}>
  //         Back
  //       </Button>
  //     </div>
  //   )
  // }

  const amount = product?.propertyValue ?? null
  const property = detailProduct?.properties?.[0]

  return (
    <div className="flex h-full min-h-0 flex-col">
    <ProductDetailsScreen
      key={productId}
      kind="mortgage"
      productId={productId}
      initialTab={initialTab}
      detailsOnly={detailsOnly}
      title={product?.name || 'Mortgage'}
      amount={detailProduct ? amountRange(detailProduct) : formatNgn(amount)}
      description={
        product?.description ||
        'Explore this mortgage option tailored for your property goals. Review the key facts below before you apply.'
      }
      duration={product?.duration || '12 months'}
      rate={detailProduct ? rateLabel(detailProduct) : product?.interestRate || '3% p.a'}
      provider={lender}
      imageUrl={imageUrl}
      applyHref={product?.id ? mortgageApplyStartHref(product.id) : '/mobile-v2/products/mortgage'}
      backHref="/mobile-v2/products/mortgage"
      detailRows={
        detailProduct
          ? [
              { label: 'Property type', value: property?.propertyType || detailProduct.subType || 'Residential' },
              { label: 'Mortgage type', value: detailProduct.subType || detailProduct.name },
              { label: 'Loan amount', value: amountRange(detailProduct) },
              { label: 'Loan Tenure', value: detailProduct.duration || 'Not specified' },
              { label: 'Repayment Frequency', value: detailProduct.repaymentFrequency || 'Not specified' },
              { label: 'Equity Contribution', value: detailProduct.equityContribution != null ? `${detailProduct.equityContribution}%` : 'Not specified' },
              { label: 'Requirements', value: requirementSummary(detailProduct) },
              { label: 'Fees & charges', value: feeSummary(detailProduct) },
              { label: 'Interest Rate', value: rateLabel(detailProduct) },
              { label: 'Powered by:', value: lender },
            ]
          : undefined
      }
      propertyRows={
        detailProduct
          ? [
              { label: 'Property Name', value: property?.name || detailProduct.name },
              { label: 'Property Type', value: property?.propertyType || 'Not specified' },
              { label: 'Property Value', value: formatNgn(property?.value ?? detailProduct.propertyValue ?? null) },
              { label: 'Location', value: property?.location || 'Not specified' },
            ]
          : undefined
      }
    />
    </div>
  )
}

export default function MortgageDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-[#FAFAFA] px-4 pt-10">
          <MortgageDetailSkeleton />
        </div>
      }
    >
      <MortgageDetailInner />
    </Suspense>
  )
}
