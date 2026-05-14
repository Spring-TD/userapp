'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MortgageApplyFlow } from '@/components/mobile-v2/mortgage/MortgageApplyFlow'
import { MortgageApplyFlowSkeleton } from '@/components/mobile-v2/data-skeletons'

function ApplyInner() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')?.trim() ?? ''

  if (!productId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center">
        <p className="text-sm text-gray-600">Missing product. Open this page from a mortgage product.</p>
        <Link href="/mobile-v2/products/mortgage" className="text-sm font-semibold text-[#2E5AAC] underline">
          Browse mortgages
        </Link>
      </div>
    )
  }

  return <MortgageApplyFlow productId={productId} />
}

export default function MortgageApplyPage() {
  return (
    <Suspense
      fallback={<MortgageApplyFlowSkeleton />}
    >
      <ApplyInner />
    </Suspense>
  )
}
