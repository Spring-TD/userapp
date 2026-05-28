'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import {
  FeaturedMortgageCard,
  MortgageProductCard,
} from '@/app/mobile-v2/products/MobileV2ProductComponents'

export function MobileV2MortgageCatalog() {
  const { appId, ready: tenantReady } = useMobileV2Tenant()
  const { loading, getProductsByType } = useMobileProducts({
    springAppId: appId ?? undefined,
    tenantReady,
  })

  const mortgageProducts = getProductsByType('Mortgage')
  const orderedProducts = useMemo(() => {
    const featuredProduct = mortgageProducts.find((product) => product.isFeatured)
    if (!featuredProduct) return mortgageProducts
    return [featuredProduct, ...mortgageProducts.filter((product) => product.id !== featuredProduct.id)]
  }, [mortgageProducts])

  const featured = orderedProducts[0]
  const hot = orderedProducts.slice(1)

  if (!tenantReady || loading) {
    return <MobileV2ProductListSkeleton />
  }

  if (!featured) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-[#1E293B]">No mortgage products available</p>
        <p className="mt-1 text-xs text-gray-500">Mortgage products will appear here once they are published for this app.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-[#1E293B]">Feature</h2>
        <Link
          href="/mobile-v2/products/mortgage/survey"
          className="rounded-lg bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
        >
          Check Eligibility
        </Link>
      </div>

      <FeaturedMortgageCard product={featured} />

      <div>
        <h2 className="mb-3 text-base font-bold text-[#1E293B]">Hot Mortgage</h2>
        {hot.length > 0 ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pl-1 pr-4 no-scrollbar">
            {hot.map((product) => (
              <div key={product.id} className="w-[200px] shrink-0">
                <p className="mb-2 pl-0.5 text-[10px] text-gray-500">By AG Mortgage Bank</p>
                <MortgageProductCard product={product} compact />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-xs text-gray-500 shadow-sm">
            No additional mortgage products available.
          </p>
        )}
      </div>
    </div>
  )
}
