'use client'

import React, { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MortgageDetailSkeleton } from '@/components/mobile-v2/data-skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveMortgagePropertyHeroImage } from '@/lib/mortgagePropertyTour'
import { mortgageApplyChoosePaymentHref } from '@/lib/mortgageApplyRoutes'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { ProductDetailsScreen } from '@/components/mobile-v2/application/ProductDetailsScreen'
import {
  amountRange,
  feeSummary,
  formatNgn,
  mortgageEquityDisplay,
  poweredBy,
  propertyDocumentationLabels,
  rateLabel,
  requirementSummary,
} from '@/lib/mobileProductDetailDisplay'
import {
  classifyEquityRequirementMode,
  hasFixedMortgageFacility,
  resolveMortgageFacilityAmount,
} from '@/lib/mortgageWorkflow'

function MortgageDetailInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawId = params?.id
  const productId = typeof rawId === 'string' ? sanitizeProductId(decodeURIComponent(rawId)) : ''
  const detailsOnly = searchParams.get('tab') === 'details'
  const initialTab = detailsOnly ? 'product' : 'history'

  const { ready: tenantReady, displayName } = useMobileV2Tenant()
  const { product: detailProduct, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  const product = useMemo(() => {
    if (!productId) return undefined
    return detailProduct ?? undefined
  }, [detailProduct, productId])

  const lender = poweredBy(displayName || undefined)
  const imageUrl = resolveMortgagePropertyHeroImage(product) || undefined

  if (!tenantReady || loading) {
    return (
      <div className="flex h-full flex-col sf-page-bg" aria-busy="true" aria-live="polite">
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

  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">This mortgage product could not be found.</p>
        <Link href="/mobile-v2/products/mortgage">
          <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
            Back to mortgages
          </Button>
        </Link>
      </div>
    )
  }

  const property = detailProduct?.properties?.[0]
  const facilityAmount = resolveMortgageFacilityAmount(detailProduct)
  const fixedFacility = hasFixedMortgageFacility(detailProduct)
  const equityMode = classifyEquityRequirementMode(detailProduct?.equityRequirement)
  const equityLine = detailProduct ? mortgageEquityDisplay(detailProduct) : 'Not specified'
  const listingValue = property?.value ?? detailProduct?.propertyValue ?? null
  const availableDocuments = propertyDocumentationLabels(property?.propertyDocumentation)

  const amountRows =
    fixedFacility && facilityAmount != null
      ? [{ label: 'Mortgage Amount', value: formatNgn(facilityAmount) }]
      : detailProduct?.amountMin != null && detailProduct?.amountMax != null
        ? [
            { label: 'Minimum amount', value: formatNgn(detailProduct.amountMin) },
            { label: 'Maximum amount', value: formatNgn(detailProduct.amountMax) },
          ]
        : [{ label: 'Mortgage Amount', value: amountRange(detailProduct!) }]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProductDetailsScreen
        key={productId}
        kind="mortgage"
        productId={productId}
        initialTab={initialTab}
        detailsOnly={detailsOnly}
        title={product?.name || 'Mortgage'}
        amount={detailProduct ? amountRange(detailProduct) : formatNgn(facilityAmount)}
        description={
          product?.description ||
          'Explore this mortgage option tailored for your property goals. Review the key facts below before you apply.'
        }
        duration={product?.duration || '12 months'}
        rate={detailProduct ? rateLabel(detailProduct) : product?.interestRate || '3% p.a'}
        provider={lender}
        imageUrl={imageUrl}
        applyHref={product?.id ? mortgageApplyChoosePaymentHref(product.id) : '/mobile-v2/products/mortgage'}
        backHref="/mobile-v2/products/mortgage"
        detailRows={
          detailProduct
            ? [
                {
                  label: 'Property type',
                  value: property?.propertyType || detailProduct.subType || 'Residential',
                },
                { label: 'Mortgage type', value: detailProduct.subType || detailProduct.name },
                ...amountRows,
                { label: 'Loan Tenure', value: detailProduct.duration || 'Not specified' },
                {
                  label: 'Repayment Frequency',
                  value: detailProduct.repaymentFrequency || 'Not specified',
                },
                {
                  label:
                    equityMode === 'percentage' && detailProduct.equityContribution != null
                      ? `Equity (${detailProduct.equityContribution}% of Mortgage Amount)`
                      : 'Equity Contribution',
                  value: equityLine,
                },
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
                {
                  label: 'Property Value (optional)',
                  value: listingValue != null ? formatNgn(listingValue) : 'Not specified',
                },
                { label: 'Location', value: property?.location || 'Not specified' },
              ]
            : undefined
        }
        availableDocuments={availableDocuments}
      />
    </div>
  )
}

export default function MortgageDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] sf-page-bg px-4 pt-10">
          <MortgageDetailSkeleton />
        </div>
      }
    >
      <MortgageDetailInner />
    </Suspense>
  )
}
