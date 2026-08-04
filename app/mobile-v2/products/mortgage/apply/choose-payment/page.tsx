'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, Loader2, PiggyBank, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { mortgageApplyStartHref } from '@/lib/mortgageApplyRoutes'
import { computeDownPaymentAmount } from '@/lib/mortgageWorkflow'
import { formatNaira } from '@/lib/mobileProductDetailDisplay'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { cn } from '@/lib/utils'

function ChoosePaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))
  const { ready: tenantReady } = useMobileV2Tenant()
  const { product, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  if (!productId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-gray-600">Missing mortgage product.</p>
        <Link href="/mobile-v2/products/mortgage" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]">
          Browse mortgages
        </Link>
      </div>
    )
  }

  if (!tenantReady || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
      </div>
    )
  }

  const property = product?.properties?.[0]
  const propertyValue = property?.value ?? product?.propertyValue ?? product?.amountMax ?? null
  const downPayment = computeDownPaymentAmount(propertyValue, product?.equityContribution ?? 10)
  const downPaymentLabel = downPayment != null ? formatNaira(downPayment) : '—'

  const continueApply = () => {
    sessionStorage.setItem(
      `mortgage_down_payment_method_${productId}`,
      'equity_contribution',
    )
    router.push(mortgageApplyStartHref(productId))
  }

  const openSavingsPlan = () => {
    sessionStorage.setItem(`mortgage_down_payment_method_${productId}`, 'savings_plan')
    const qs = new URLSearchParams({
      from: 'mortgage',
      productId,
    })
    if (downPayment != null) qs.set('goalAmount', String(downPayment))
    router.push(`/mobile-v2/products/savings?${qs.toString()}`)
  }

  return (
    <div className="relative flex min-h-full flex-col sf-page-bg">
      <div className="px-6 pt-12">
        <Link
          href={`/mobile-v2/products/mortgage/${encodeURIComponent(productId)}?tab=details`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="absolute inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl md:left-1/2 md:w-[400px] md:-translate-x-1/2">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-gray-300" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1E293B]">Down payment required</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              This mortgage requires a down payment of{' '}
              <strong className="text-[var(--sf-ink,#1E293B)]">{downPaymentLabel}</strong>. How would
              you like to proceed?
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={openSavingsPlan}
              className="flex w-full items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-left transition hover:sf-border-brand border"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-button,#1E40AF)]">
                <PiggyBank className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Savings plan</span>
                <span className="mt-1 block text-xs text-gray-500">
                  Browse savings products and start saving toward your down payment.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={continueApply}
              className="flex w-full items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-left transition hover:sf-border-brand border"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-button,#1E40AF)]">
                <Wallet className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--sf-ink,#1E293B)]">
                  Down payment / equity contribution
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Continue with your mortgage application now.
                </span>
              </span>
            </button>
          </div>

          <Button
            variant="ghost"
            className="mt-6 h-11 w-full text-sm font-medium text-gray-600"
            onClick={() => router.push('/mobile-v2/products/mortgage')}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MortgageChoosePaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center sf-page-bg text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <ChoosePaymentContent />
    </Suspense>
  )
}
