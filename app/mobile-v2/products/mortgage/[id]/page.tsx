'use client'

import React, { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Calendar, Percent, Home, User, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MobileV2TabBar } from '../../MobileV2ProductComponents'
import { MortgageDetailSkeleton } from '@/components/mobile-v2/data-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

function formatNgn(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) return '—'
  return `NGN${amount.toLocaleString('en-NG')}`
}

function MortgageDetailInner() {
  const params = useParams()
  const router = useRouter()
  const rawId = params?.id
  const productId = typeof rawId === 'string' ? decodeURIComponent(rawId) : ''

  const { appId: tenantAppId, ready: tenantReady } = useMobileV2Tenant()
  const springAppId = tenantAppId ?? process.env.NEXT_PUBLIC_SPRING_APP_ID

  const { products, loading, getProductById } = useMobileProducts({
    type: 'Mortgage',
    springAppId: springAppId || undefined,
    autoFetch: true,
    tenantReady,
  })

  const product = useMemo(() => (productId ? getProductById(productId) : undefined), [getProductById, productId])
  const [carousel, setCarousel] = useState(0)

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
  //       <Button className="rounded-full bg-[#2E5AAC] text-white" onClick={() => router.push('/mobile-v2/products/mortgage')}>
  //         Back
  //       </Button>
  //     </div>
  //   )
  // }

  const amount = product?.propertyValue ?? null

  return (
    <div className="flex h-full flex-col bg-[#FAFAFA]">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-28">
        <div className="sticky top-0 z-20 bg-white px-4 pb-3 pt-10 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Link
              href="/mobile-v2/products/mortgage"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </div>
          <MobileV2TabBar activeTab="Mortgage" />
        </div>

        <div className="px-4 pt-4">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[24px] bg-gray-200">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold text-[#2E5AAC] shadow-sm">
              By {lender}
            </span>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Image ${i + 1}`}
                  onClick={() => setCarousel(i)}
                  className={`h-1.5 rounded-full transition-all ${i === carousel ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-start justify-between gap-3">
            <h1 className="text-lg font-bold leading-snug text-[#1E293B]">{product?.name}</h1>
            <p className="shrink-0 text-lg font-bold text-[#1E293B]">{formatNgn(amount)}</p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {product?.description ||
              'Explore this mortgage option tailored for your property goals. Review the key facts below before you apply.'}
          </p>

          <div className="mt-4 flex gap-8 text-sm text-gray-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#2E5AAC]" />
              <span>{product?.duration || '12 months'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-[#2E5AAC]" />
              <span>{product?.interestRate || '3% p.a'}</span>
            </div>
          </div>

          <dl className="mt-8 space-y-4 border-t border-gray-200 pt-6 text-sm">
            {[
              ['Property type', 'Residential'],
              ['Mortgage type', 'Fixed rate'],
              ['Loan tenure', product?.duration || '7 years'],
              ['Down payment', product?.equityContribution != null ? `${product?.equityContribution}%` : '10%'],
              ['Fees & charges', 'Nil'],
              ['Interest rate', product?.interestRate || '3% P.A'],
              ['Mortgage insurance', 'AICCO Insurance'],
              ['Automation', 'Monthly'],
              ['Powered by', lender],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-gray-500">{k}</dt>
                <dd className="max-w-[55%] text-right font-medium text-[#1E293B]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="absolute bottom-24 left-4 right-4 z-30">
        <Link href={`/mobile-v2/products/mortgage/apply?productId=${encodeURIComponent(product?.id ?? '')}`}>
          <Button className="h-14 w-full rounded-full bg-[#2E5AAC] text-base font-semibold text-white hover:bg-[#265499]">
            Apply
          </Button>
        </Link>
      </div>

      <div className="absolute bottom-6 left-6 right-6 z-40 flex h-[72px] items-center justify-around rounded-[24px] bg-white px-2 shadow-[0_4px_30px_rgba(0,0,0,0.08)]">
        <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link href="/mobile-v2/accounts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <User className="h-6 w-6" />
          <span className="text-[10px] font-medium">Account</span>
        </Link>
        <div className="flex flex-col items-center gap-1 text-[#1E40AF]">
          <Briefcase className="h-6 w-6 fill-current" />
          <span className="text-[10px] font-bold">Product</span>
        </div>
        <Link href="/mobile-v2/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
          <User className="h-6 w-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
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
