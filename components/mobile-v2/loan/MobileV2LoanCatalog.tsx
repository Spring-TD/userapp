'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons'
import { DUMMY_FEATURED_LOAN, DUMMY_HOT_LOANS } from '@/lib/loanCatalogDummy'
import { buildLoanCatalogFromProducts } from '@/lib/mapProductToLoanCatalog'
import type { LoanCatalogItem } from '@/types/loanCatalog'
import { cn } from '@/lib/utils'

import { loanDetailHref } from '@/lib/loanApplyRoutes'

function FeaturedLoanCard({ item }: { item: LoanCatalogItem }) {
  const [slide, setSlide] = useState(0)

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg"
        style={{
          background: 'linear-gradient(145deg, #1E1B4B 0%, #312e81 45%, #1e3a8a 100%)',
          minHeight: 220,
        }}
      >
        <div className="flex flex-col h-full justify-between gap-4">
          <div>
            <span className="text-[10px] font-medium text-blue-200/90 block mb-1">
              {item.loanAmountLabel || 'Loan Amount'}
            </span>
            <p className="text-[28px] font-bold leading-tight tracking-tight">
              {item.loanAmountDisplay || item.amountDisplay.replace(/^NGN/, '')}
            </p>

            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-200" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] text-blue-300 block">Duration</span>
                  <span className="text-[11px] font-bold">{item.duration}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4 text-blue-200" />
                </div>
                <div className="leading-tight">
                  <span className="text-[9px] text-blue-300 block">Interest</span>
                  <span className="text-[11px] font-bold">{item.interestRate}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-blue-100/95 leading-relaxed mt-4 pr-2 font-light">
              {item.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 mt-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-9 h-9 rounded-full bg-amber-400/90 shrink-0 border-2 border-white/30 bg-cover bg-center"
                style={
                  item.providerLogoUrl
                    ? { backgroundImage: `url(${item.providerLogoUrl})` }
                    : undefined
                }
              />
              <span className="text-[11px] font-semibold truncate">{item.providerName}</span>
            </div>
            <Link href={loanDetailHref(item.id)}>
              <Button className="h-9 shrink-0 rounded-xl bg-[var(--sf-primary,#2563EB)] hover:bg-[var(--sf-primary,#2563EB)] text-white text-[11px] font-semibold px-4 shadow-lg shadow-blue-500/30">
                Apply for Loan
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
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

function HotLoanCard({ item }: { item: LoanCatalogItem }) {
  const DEFAULT_IMAGE =
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop'

  return (
    <div className="flex flex-col">
      <p className="text-[10px] text-gray-500 mb-2 pl-0.5">By {item.providerName}</p>
      <div className="rounded-[20px] border border-gray-100 bg-white p-3 shadow-sm flex flex-col h-full">
        <div
          className="relative w-full aspect-square rounded-[16px] mb-3 overflow-hidden bg-gray-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${item.imageUrl || DEFAULT_IMAGE})` }}
        />
        <h3 className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)] leading-snug">{item.title}</h3>
        <p className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)] mt-0.5">{item.amountDisplay}</p>
        <p className="text-[10px] text-gray-500 leading-relaxed mt-2 line-clamp-3 flex-1">
          {item.description}
        </p>
        <div className="flex gap-4 text-[10px] text-gray-600 mt-3 mb-3">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[var(--sf-primary,#2563EB)]" />
            {item.duration}
          </span>
          <span className="inline-flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-[var(--sf-primary,#2563EB)]" />
            {item.interestRate}
          </span>
        </div>
        <Link href={loanDetailHref(item.id)}>
          <Button className="w-full h-10 rounded-full bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)] text-white text-xs font-semibold mt-auto">
            Apply for Loan
          </Button>
        </Link>
      </div>
    </div>
  )
}

export function MobileV2LoanCatalog() {
  const { appId, ready: tenantReady } = useMobileV2Tenant()
  const { loading } = useMobileProducts({
    springAppId: appId ?? undefined,
    tenantReady,
  })

  /** Static mock catalog for now (matches product design). */
  const { featured, hot } = useMemo(
    () => buildLoanCatalogFromProducts([], true, DUMMY_FEATURED_LOAN, DUMMY_HOT_LOANS),
    [],
  )

  if (!tenantReady || loading) {
    return <MobileV2ProductListSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[#1E293B] text-base">Feature Loan</h2>
        <Link
          href="/mobile-v2/products/loan"
          className="rounded-lg bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
        >
          Check Eligibility
        </Link>
      </div>

      <FeaturedLoanCard item={featured} />

      <div>
        <h2 className="font-bold text-[#1E293B] text-base mb-4">Hot Loan</h2>
        <div className="grid grid-cols-2 gap-4">
          {hot.map((item) => (
            <HotLoanCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}
