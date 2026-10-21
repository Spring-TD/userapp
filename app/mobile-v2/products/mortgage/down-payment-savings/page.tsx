'use client'

import React, { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import {
  mortgageApplyChoosePaymentHref,
  mortgageApplyStartHref,
  mortgageDetailHref,
} from '@/lib/mortgageApplyRoutes'
import { resolveMortgageEquityRequired } from '@/lib/mortgageWorkflow'
import {
  computeSavingsPlanOptions,
  formatSavingsDuration,
  formatSavingsMoney,
  mortgagePendingSavingsHref,
  submitMortgageSavingsApplication,
  type MortgageSavingsDurationMonths,
} from '@/lib/mortgageDownPaymentSavings'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { cn } from '@/lib/utils'

const FI_NAME = 'AG Mortgage Bank'
const RECOMMENDED_MONTHS: MortgageSavingsDurationMonths = 36

function PlannerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = sanitizeProductId(searchParams.get('productId'))
  const { ready: tenantReady } = useMobileV2Tenant()
  const { product, loading } = useMobileProductDetail({
    productId,
    enabled: tenantReady && Boolean(productId),
  })

  const [selectedMonths, setSelectedMonths] = useState<MortgageSavingsDurationMonths>(RECOMMENDED_MONTHS)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const property = product?.properties?.[0]
  const propertyName =
    property?.name || product?.name || 'this property'
  const goalAmount = resolveMortgageEquityRequired(product) ?? 0

  const plans = useMemo(() => computeSavingsPlanOptions(goalAmount), [goalAmount])
  const selected = plans.find((p) => p.months === selectedMonths) ?? plans[0]

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

  if (!goalAmount || !selected) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-gray-600">Unable to calculate a down payment goal for this mortgage.</p>
        <Link
          href={mortgageApplyChoosePaymentHref(productId)}
          className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]"
        >
          Back to payment options
        </Link>
      </div>
    )
  }

  const handleApply = () => {
    setSubmitting(true)
    try {
      const app = submitMortgageSavingsApplication({
        productId,
        productName: product?.name || 'Mortgage',
        propertyName: String(propertyName),
        goalAmount,
        months: selected.months,
        monthly: selected.monthly,
        interest: selected.interest,
      })
      setSubmittedId(app.id)
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedId) {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-white">
        <header className="relative shrink-0 bg-[#E9EFFC] px-5 pb-6 pt-6">
          <button
            type="button"
            onClick={() => router.push(mortgageDetailHref(productId))}
            className="absolute left-5 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4 text-[#16213E]" />
          </button>
          <p className="pt-1.5 text-center text-[17px] font-bold text-[#16213E]">Down payment savings</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-36 pt-5">
          <div className="px-1.5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E3F7EC]">
              <Check className="h-7 w-7 text-[#1C9A5B]" strokeWidth={2.5} />
            </div>
            <h2 className="text-lg font-bold text-[#16213E]">Application submitted</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6B7488]">
              {FI_NAME} will review your request for {formatSavingsMoney(selected.monthly)}/month over{' '}
              {formatSavingsDuration(selected.months)} and set up a matching Target Savings plan. We&apos;ll
              let you know as soon as it&apos;s approved so you can start funding it.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E7EAF3] bg-[#FAFAFC] px-4">
            <SummaryRow label="Down payment goal" value={formatSavingsMoney(goalAmount)} />
            <SummaryRow
              label="Requested contribution"
              value={`${formatSavingsMoney(selected.monthly)} / month`}
            />
            <SummaryRow label="Requested duration" value={formatSavingsDuration(selected.months)} />
            <SummaryRow label="Status" value="Pending review" last />
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-[#E7EAF3] bg-white px-5 pb-6 pt-3.5">
          <Button
            className="h-12 w-full rounded-full bg-[#2F5FE3] text-[15px] font-bold text-white hover:bg-[#2F5FE3]/90"
            onClick={() => router.push(mortgagePendingSavingsHref())}
          >
            View Pending Savings
          </Button>
          <button
            type="button"
            className="mt-3 w-full text-center text-xs font-semibold text-[#6B7488]"
            onClick={() => router.push(mortgageApplyStartHref(productId))}
          >
            Continue mortgage application
          </button>
        </footer>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      <header className="relative shrink-0 bg-[#E9EFFC] px-5 pb-6 pt-6">
        <button
          type="button"
          onClick={() => router.push(mortgageApplyChoosePaymentHref(productId))}
          className="absolute left-5 top-6 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4 text-[#16213E]" />
        </button>
        <p className="pt-1.5 text-center text-[17px] font-bold text-[#16213E]">Down payment savings</p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-36 pt-5">
        <div className="mb-5 rounded-2xl bg-[#EBF1FD] p-4">
          <p className="text-sm font-bold text-[#16213E]">Mortgage down payment</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B7488]">
            You&apos;re building toward a{' '}
            <strong className="text-[#16213E]">{formatSavingsMoney(goalAmount)}</strong> down payment on{' '}
            {propertyName}. Set up a Target Savings plan below, or jump back into your mortgage application
            at any time.
          </p>
          <button
            type="button"
            onClick={() => router.push(mortgageApplyStartHref(productId))}
            className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-[#E7EAF3] bg-white py-2.5 text-[13px] font-bold text-[#16213E]"
          >
            Continue mortgage application
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-2xl bg-[#16213E] px-5 py-4 text-white">
          <div>
            <p className="text-xs text-white/70">Down payment goal</p>
            <p className="mt-1 text-[22px] font-bold">{formatSavingsMoney(goalAmount)}</p>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap">
            Fixed by lender
          </span>
        </div>

        <div className="mb-5 flex gap-2.5 rounded-[14px] border border-[#F5DFB3] bg-[#FFF6E9] px-3.5 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#92650F]" />
          <div>
            <p className="text-[13px] font-bold text-[#92650F]">Property availability notice</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A5A1E]">
              If {propertyName} sells out before you complete this savings plan, we&apos;ll offer you a
              similar property based on availability and prevailing market prices at that time.
            </p>
          </div>
        </div>

        <p className="text-base font-bold text-[#16213E]">How long do you want to save?</p>
        <p className="mb-4 mt-1 text-[13px] leading-relaxed text-[#6B7488]">
          Pick a timeline — we&apos;ll work out your monthly contribution at 12% p.a. so you hit your goal
          on time.
        </p>

        <div className="space-y-2.5">
          {plans.map((plan) => {
            const isSelected = plan.months === selectedMonths
            const isRecommended = plan.months === RECOMMENDED_MONTHS
            return (
              <button
                key={plan.months}
                type="button"
                onClick={() => setSelectedMonths(plan.months)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left transition',
                  isSelected
                    ? 'border-[#2F5FE3] bg-[#EBF1FD]'
                    : 'border-[#E7EAF3] bg-white hover:border-[#D7DAE4]',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-[#2F5FE3]' : 'border-[#D7DAE4]',
                  )}
                >
                  {isSelected ? <span className="h-2.5 w-2.5 rounded-full bg-[#2F5FE3]" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#16213E]">
                    {formatSavingsDuration(plan.months)}
                    {isRecommended ? (
                      <span className="rounded-full bg-[#DCE6FD] px-2 py-0.5 text-[10px] font-bold text-[#2F5FE3]">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#6B7488]">
                    Earn {formatSavingsMoney(plan.interest)} in interest
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <strong className="block text-sm font-bold text-[#16213E]">
                    {formatSavingsMoney(plan.monthly)}
                  </strong>
                  <span className="text-[11px] text-[#6B7488]">per month</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[#E7EAF3] bg-[#FAFAFC] px-4">
          <SummaryRow label="Down payment goal" value={formatSavingsMoney(goalAmount)} />
          <SummaryRow label="Monthly contribution" value={formatSavingsMoney(selected.monthly)} />
          <SummaryRow label="Duration" value={formatSavingsDuration(selected.months)} />
          <SummaryRow label="Interest rate" value="12% p.a." />
          <SummaryRow
            label="Total interest earned"
            value={formatSavingsMoney(selected.interest)}
            highlight
          />
          <SummaryRow label="Total at maturity" value={formatSavingsMoney(goalAmount)} last />
        </div>

        <div className="mt-3 mb-2 flex gap-2 rounded-xl bg-[#EBF1FD] px-3.5 py-3 text-xs leading-relaxed text-[#2347B8]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Target Savings plans are set up by {FI_NAME}. Applying sends them your goal and timeline to
            review — you&apos;ll be notified as soon as it&apos;s approved and ready to fund.
          </span>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-[#E7EAF3] bg-white px-5 pb-6 pt-3.5">
        <Button
          disabled={submitting}
          className="h-12 w-full rounded-full bg-[#2F5FE3] text-[15px] font-bold text-white hover:bg-[#2F5FE3]/90"
          onClick={handleApply}
        >
          {submitting ? 'Submitting…' : 'Apply for this savings plan'}
        </Button>
        <p className="mt-2.5 text-center text-xs text-[#6B7488]">
          {formatSavingsMoney(selected.monthly)} / month for {formatSavingsDuration(selected.months)} · 12%
          p.a.
        </p>
      </footer>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
  last,
}: {
  label: string
  value: string
  highlight?: boolean
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-3 text-[13px]',
        !last && 'border-b border-[#E7EAF3]',
      )}
    >
      <span className="text-[#6B7488]">{label}</span>
      <span className={cn('font-bold', highlight ? 'text-[#1C9A5B]' : 'text-[#16213E]')}>{value}</span>
    </div>
  )
}

export default function MortgageDownPaymentSavingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-white text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <PlannerContent />
    </Suspense>
  )
}
