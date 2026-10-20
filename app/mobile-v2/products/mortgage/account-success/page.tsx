'use client'

import React, { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { mortgageApplyHref } from '@/lib/mortgageApplyRoutes'

function MortgageAccountSuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))
  const continueHref = productId ? mortgageApplyHref(productId) : '/mobile-v2/products/mortgage'

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace(continueHref)
    }, 5_000)

    return () => window.clearTimeout(timer)
  }, [continueHref, router])

  return (
    <div className="flex min-h-full flex-col sf-page-bg">
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
        <div className="relative mb-8 h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-[#2DD4BF] opacity-20" />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-[#2DD4BF] shadow-lg">
            <Check className="h-16 w-16 stroke-[4] text-white" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#1E293B]">Account created successfully</h1>
        <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-gray-500">
          Your mortgage account has been set up. You can now continue to complete your mortgage
          application. Redirecting in 5 seconds...
        </p>

        <Link href={continueHref} className="mt-10 w-full max-w-sm">
          <Button className="h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white shadow-xl hover:bg-[var(--sf-button-hover,#1e3a8a)]">
            Continue to mortgage application
          </Button>
        </Link>

        <Link
          href="/mobile-v2/products/mortgage"
          className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Back to mortgages
        </Link>
      </div>
    </div>
  )
}

export default function MortgageAccountSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center sf-page-bg">
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
        </div>
      }
    >
      <MortgageAccountSuccessInner />
    </Suspense>
  )
}
