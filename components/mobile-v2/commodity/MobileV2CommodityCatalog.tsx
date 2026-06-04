'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import {
  asCommodityCatalogProduct,
  type CommodityCatalogProduct,
} from '@/lib/commodityCatalog'
import { commodityDetailHref } from '@/lib/commodityApplyRoutes'
import { cn } from '@/lib/utils'

function formatNgn(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return 'NGN—'
  return `NGN${amount.toLocaleString('en-NG')}`
}

function FeaturedCommodityCard({ product, providerName }: { product: CommodityCatalogProduct; providerName: string }) {
  const [slide, setSlide] = useState(0)

  return (
    <div className="space-y-3">
      <Link href={commodityDetailHref(product.id)} className="block">
        <div className="overflow-hidden rounded-[22px] bg-transparent">
          <div
            className="relative h-[185px] w-full overflow-hidden rounded-[18px] bg-gray-100 bg-cover bg-center"
            style={{ backgroundImage: `url(${product.image})` }}
          >
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-4 py-1.5 text-[10px] font-medium text-gray-700 shadow-sm">
              By {providerName}
            </span>
          </div>

          <div className="pt-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="line-clamp-1 text-sm font-medium text-[#1E293B]">
                {product.name}.....
              </h3>
              <span className="shrink-0 text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">
                {formatNgn(product.price)}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-600">
              {product.description}
            </p>
            <div className="mt-4 flex gap-6 text-[11px] font-semibold text-gray-600">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {product.duration}
              </span>
              <span className="inline-flex items-center gap-2">
                <Percent className="h-3.5 w-3.5 text-gray-400" />
                {product.interestRate}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Commodity slide ${i + 1}`}
            onClick={() => setSlide(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === slide ? 'w-5 bg-[var(--sf-button,#1E40AF)]' : 'w-1.5 bg-gray-300',
            )}
          />
        ))}
      </div>
    </div>
  )
}

function CommodityGridCard({ product, providerName }: { product: CommodityCatalogProduct; providerName: string }) {
  return (
    <div>
      <p className="mb-2 pl-0.5 text-[10px] text-gray-600">By {providerName}</p>
      <Link href={commodityDetailHref(product.id)} className="block">
        <div
          className="mb-3 aspect-square w-full rounded-[10px] bg-gray-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${product.image})` }}
        />
      </Link>
      <h3 className="line-clamp-1 text-sm font-medium text-[#1E293B]">{product.name}...</h3>
      <p className="mt-1 text-xs font-bold text-[#1E293B]">{formatNgn(product.price)}</p>
      <p className="mt-2 line-clamp-3 text-[9px] leading-relaxed text-gray-400">
        {product.description}
      </p>
      <div className="mt-3 flex gap-3 text-[9px] font-semibold text-gray-600">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          {product.duration}
        </span>
        <span className="inline-flex items-center gap-1">
          <Percent className="h-3 w-3 text-gray-400" />
          {product.interestRate}
        </span>
      </div>
      <Link href={commodityDetailHref(product.id)}>
        <Button className="mt-3 h-9 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-xs font-medium text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
          Buy Commodity
        </Button>
      </Link>
    </div>
  )
}

export function MobileV2CommodityCatalog() {
  const { appId, ready: tenantReady, displayName } = useMobileV2Tenant()
  const { loading, getProductsByType } = useMobileProducts({
    springAppId: appId ?? undefined,
    tenantReady,
  })

  const apiCommodities = getProductsByType('Commodity')

  const commodities = useMemo(() => apiCommodities.map(asCommodityCatalogProduct), [apiCommodities])
  const featured = commodities[0]
  const otherCommodities = commodities.slice(1)
  const providerName = displayName || 'Provider'

  if (!tenantReady || loading) {
    return <MobileV2ProductListSkeleton />
  }

  if (!featured) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-[#1E293B]">No commodity products available</p>
        <p className="mt-1 text-xs text-gray-500">Commodity products will appear here once they are published for this app.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-base font-bold text-[#1E293B]">Feature</h2>
        <FeaturedCommodityCard product={featured} providerName={providerName} />
      </div>

      <div>
        <h2 className="mb-4 text-base font-bold text-[#1E293B]">Commodity</h2>
        {otherCommodities.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-14">
            {otherCommodities.map((product) => (
              <CommodityGridCard key={product.id} product={product} providerName={providerName} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-xs text-gray-500 shadow-sm">
            No additional commodity products available.
          </p>
        )}
      </div>
    </div>
  )
}
