'use client'

import React, { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { mortgageApplyChoosePaymentHref } from '@/lib/mortgageApplyRoutes'
import { sanitizeProductId } from '@/lib/sanitizeProductId'

function OfferStartRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))

  useEffect(() => {
    if (productId) {
      router.replace(mortgageApplyChoosePaymentHref(productId))
      return
    }
    router.replace('/mobile-v2/products/mortgage/pending')
  }, [productId, router])

  return (
    <div className="flex min-h-[50vh] items-center justify-center sf-page-bg">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
    </div>
  )
}

export default function MortgageOfferStartPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center sf-page-bg text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <OfferStartRedirect />
    </Suspense>
  )
}
