'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ProductApplicationFlow } from '@/components/mobile-v2/application/ProductApplicationFlow'
import { sanitizeProductId } from '@/lib/sanitizeProductId'

function LoanApplyInner() {
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))

  if (!productId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
        <p className="text-sm text-gray-600">Missing product. Open this page from a loan product.</p>
        <Link href="/mobile-v2/products/loan" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)] underline">
          Browse loans
        </Link>
      </div>
    )
  }

  return <ProductApplicationFlow kind="loan" productId={productId} />
}

export default function LoanApplyPage() {
  return (
    <Suspense fallback={null}>
      <LoanApplyInner />
    </Suspense>
  )
}
