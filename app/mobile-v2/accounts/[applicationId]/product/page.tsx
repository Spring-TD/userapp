'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { AmortizationScheduleSection } from '@/components/mobile-v2/AmortizationScheduleSection'
import { LoanPendingThreadScreen } from '@/components/mobile-v2/loan/LoanPendingThreadScreen'
import { MortgagePendingThreadScreen } from '@/components/mobile-v2/mortgage/MortgagePendingThreadScreen'
import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserWallet } from '@/hooks/useUserWallet'
import {
  isLoanDisbursedForSchedule,
  isScheduleConfirmed,
  normalizeAmortizationSchedule,
  resolveScheduleInterestRateLabel,
  type AmortizationSchedule,
} from '@/lib/amortizationSchedule'
import { fetchMobileProductById } from '@/lib/fetchMobileProductById'
import { humanizeLabel, rateLabel } from '@/lib/mobileProductDetailDisplay'
import { resolveUserProductApplication } from '@/lib/services/productApplicationApi'
import {
  fetchApplicationById,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import type { MobileProduct } from '@/lib/storefrontProducts'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function formatAmount(value: number | undefined, currency: string): string | null {
  return value == null ? null : formatWalletBalance(value, currency)
}

function productFacts(
  product: MobileProduct,
  currency: string,
  schedule?: AmortizationSchedule | null,
): Array<[string, string]> {
  const amountRange =
    product.amountMin != null || product.amountMax != null
      ? [formatAmount(product.amountMin, currency), formatAmount(product.amountMax, currency)]
          .filter(Boolean)
          .join(' – ')
      : null

  const interestRate =
    resolveScheduleInterestRateLabel(schedule, product.interestRate) ||
    rateLabel(product) ||
    product.interestRate ||
    ''

  const interestMethod = schedule?.interestMethod || product.interestMethod || ''

  return [
    ['Product type', product.type],
    ['Product category', product.subType || ''],
    ['Amount range', amountRange || ''],
    ['Interest rate', interestRate],
    ['Interest method', interestMethod],
    ['Duration', product.duration || ''],
    ['Repayment frequency', product.repaymentFrequency || ''],
    ['Withdrawal flexibility', product.withdrawalFlexibility || ''],
    ['Price', formatAmount(product.price, currency) || ''],
    ['Minimum quantity', product.minimumQuantity != null ? String(product.minimumQuantity) : ''],
    ['Unit', product.unitOfMeasure || ''],
    ['Return on investment', product.roi || ''],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

function normalizeType(value?: string | null): string {
  return String(value || '').trim().toUpperCase()
}

function isPendingApplication(status?: string | null): boolean {
  const normalized = String(status || '').trim().toLowerCase()
  if (!normalized) return true
  if (
    ['completed', 'disbursed', 'active', 'allocated', 'rejected', 'declined', 'cancelled', 'canceled'].some(
      (token) => normalized.includes(token),
    )
  ) {
    return false
  }
  return (
    normalized.includes('pending') ||
    normalized.includes('submitted') ||
    normalized.includes('review') ||
    normalized.includes('approved') ||
    normalized.includes('offer') ||
    normalized.includes('awaiting') ||
    normalized.includes('progress') ||
    normalized.includes('inspection') ||
    normalized.includes('payment') ||
    normalized.includes('contract')
  )
}

function toStorefrontApplication(
  application: ProductApplication,
  extras?: Partial<StorefrontApplication>,
): StorefrontApplication {
  return {
    id: application.id,
    _id: application.id,
    userId: application.userId,
    productId: application.productId,
    productName: application.productName,
    productType: application.productType,
    status: application.status,
    loanWorkflowStatus: application.loanWorkflowStatus,
    requirementsSnapshot: application.requirementsSnapshot as StorefrontApplication['requirementsSnapshot'],
    productWallet: application.productWallet,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    amount: (application as { amount?: number }).amount,
    currency: (application as { currency?: string }).currency,
    ...extras,
  }
}

function EmbeddedWorkflowFallback() {
  return (
    <div className="space-y-3 rounded-2xl border sf-border-subtle px-4 py-5">
      <Skeleton className="h-4 w-24 bg-gray-200/90" />
      <Skeleton className="h-3 w-48 bg-gray-200/90" />
      <Skeleton className="h-16 w-full bg-gray-200/90" />
      <Skeleton className="h-16 w-full bg-gray-200/90" />
    </div>
  )
}

export default function AppliedProductDetailPage() {
  const params = useParams<{ applicationId: string }>()
  const applicationId = decodeURIComponent(String(params.applicationId || ''))
  const { wallet, loading: walletLoading } = useUserWallet()
  const [application, setApplication] = useState<ProductApplication | null>(null)
  const [detailApplication, setDetailApplication] = useState<StorefrontApplication | null>(null)
  const [schedule, setSchedule] = useState<AmortizationSchedule | null>(null)
  const [product, setProduct] = useState<MobileProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = wallet?.userId
    if (walletLoading) {
      setLoading(true)
      return
    }
    if (!userId) {
      setError('Unable to verify this product application.')
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)

      const [resolved, byId] = await Promise.all([
        resolveUserProductApplication(userId, applicationId),
        fetchApplicationById(applicationId),
      ])
      if (cancelled) return

      const matchedApplication = resolved.application
      if (resolved.error || !matchedApplication) {
        setError(resolved.error || 'This product application was not found.')
        setLoading(false)
        return
      }

      setApplication(matchedApplication)

      const live = byId.ok ? byId.application : null
      const liveSchedule = normalizeAmortizationSchedule(
        (live as { amortizationSchedule?: unknown } | null)?.amortizationSchedule ??
          (matchedApplication as { amortizationSchedule?: unknown }).amortizationSchedule,
      )
      setSchedule(liveSchedule)
      const storefrontForSchedule = live
        ? { ...toStorefrontApplication(matchedApplication), ...live }
        : toStorefrontApplication(matchedApplication)
      if (
        normalizeType(matchedApplication.productType) === 'LOAN' &&
        isLoanDisbursedForSchedule({
          status: storefrontForSchedule.status,
          loanWorkflowStatus: storefrontForSchedule.loanWorkflowStatus,
          postApprovalFulfillment: storefrontForSchedule.postApprovalFulfillment,
          amortizationSchedule: liveSchedule,
        }) &&
        (!liveSchedule || !isScheduleConfirmed(liveSchedule))
      ) {
        setScheduleLoading(true)
      } else {
        setScheduleLoading(false)
      }
      setDetailApplication(storefrontForSchedule)

      try {
        const matchedProduct = await fetchMobileProductById(matchedApplication.productId)
        if (cancelled) return
        setProduct(matchedProduct)
        setError(matchedProduct ? null : 'Product details are unavailable.')
      } catch (fetchError) {
        if (cancelled) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load product details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applicationId, wallet?.userId, walletLoading])

  const productType = normalizeType(application?.productType || product?.type)
  const isLoan = productType === 'LOAN'
  const isMortgage = productType === 'MORTGAGE'
  const scheduleApplication = detailApplication || (application ? toStorefrontApplication(application) : null)
  const showAmortization =
    Boolean(isLoan && scheduleApplication && isLoanDisbursedForSchedule({
      status: scheduleApplication.status,
      loanWorkflowStatus: scheduleApplication.loanWorkflowStatus,
      postApprovalFulfillment: scheduleApplication.postApprovalFulfillment,
      amortizationSchedule: schedule,
    }))

  // Backend may backfill billing plan on first open — poll GET application until confirmed.
  useEffect(() => {
    if (!showAmortization || !applicationId) return
    if (schedule && isScheduleConfirmed(schedule)) {
      setScheduleLoading(false)
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 20

    setScheduleLoading(true)

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1
        const byId = await fetchApplicationById(applicationId)
        if (cancelled) return

        if (byId.ok && byId.application) {
          const liveSchedule = normalizeAmortizationSchedule(byId.application.amortizationSchedule)
          if (liveSchedule) {
            setSchedule(liveSchedule)
            setDetailApplication((prev) =>
              prev
                ? { ...prev, ...byId.application, amortizationSchedule: byId.application?.amortizationSchedule }
                : prev,
            )
            if (isScheduleConfirmed(liveSchedule)) {
              setScheduleLoading(false)
              return
            }
          }
        }

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }

      if (!cancelled) setScheduleLoading(false)
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [applicationId, showAmortization, schedule?.source])

  const showWorkflow =
    Boolean(application) &&
    (isLoan || isMortgage) &&
    isPendingApplication(application?.status) &&
    !showAmortization

  const storefrontApplication = useMemo(
    () => detailApplication || (application ? toStorefrontApplication(application) : null),
    [application, detailApplication],
  )

  const currency = application?.currency || wallet?.currency || schedule?.currency || 'NGN'
  const facts = product ? productFacts(product, currency, schedule) : []
  const subtitle =
    scheduleApplication?.customerName ||
    scheduleApplication?.applicantName ||
    product?.description ||
    ''

  return (
    <MobileFlowShell title="Product details">
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl bg-gray-200/90" />
          <Skeleton className="h-20 w-full rounded-2xl bg-gray-200/90" />
          <Skeleton className="h-48 w-full rounded-2xl bg-gray-200/90" />
        </div>
      ) : error || !application || !product ? (
        <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center">
          <p className="text-sm font-semibold sf-text-ink">Product details unavailable</p>
          <p className="mt-1 text-xs text-gray-500">{error || 'This product could not be loaded.'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="sf-bg-button rounded-2xl px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-wide text-white/70">{product.type}</p>
            <h1 className="mt-2 text-xl font-bold">{product.name}</h1>
            {subtitle ? <p className="mt-3 text-sm leading-6 text-white/80">{subtitle}</p> : null}
          </section>

          <section className="rounded-2xl border sf-border-subtle px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">Application reference</p>
                <p className="mt-1 break-all text-sm font-semibold sf-text-ink">{application.id}</p>
              </div>
              <span className="sf-accent-soft shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase sf-text-ink">
                {application.status}
              </span>
            </div>
          </section>

          {facts.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-bold sf-text-ink">Product information</h2>
              <dl className="rounded-2xl border sf-border-subtle px-4">
                {facts.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0"
                  >
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="max-w-[58%] text-right text-xs font-semibold sf-text-ink">
                      {label === 'Interest method' ? humanizeLabel(value) : value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {showAmortization ? (
            scheduleLoading ? (
              <section className="rounded-2xl border sf-border-subtle px-4 py-5">
                <p className="text-sm font-semibold sf-text-ink">Preparing your repayment schedule</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Your confirmed amortization schedule is being generated. This usually takes a moment
                  after disbursement.
                </p>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-16 w-full rounded-2xl bg-gray-200/90" />
                  <Skeleton className="h-16 w-full rounded-2xl bg-gray-200/90" />
                  <Skeleton className="h-24 w-full rounded-2xl bg-gray-200/90" />
                </div>
              </section>
            ) : schedule ? (
              <AmortizationScheduleSection
                schedule={schedule}
                interestRateLabel={resolveScheduleInterestRateLabel(schedule, rateLabel(product))}
                interestMethod={schedule.interestMethod || product.interestMethod}
              />
            ) : (
              <section className="rounded-2xl border sf-border-subtle px-4 py-5">
                <p className="text-sm font-semibold sf-text-ink">Repayment schedule not ready yet</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Your loan is disbursed but the confirmed schedule is still being prepared. Reopen
                  this page in a moment to view your repayment plan.
                </p>
              </section>
            )
          ) : null}

          {showWorkflow && storefrontApplication ? (
            <section>
              <h2 className="mb-3 text-sm font-bold sf-text-ink">
                {isMortgage ? 'Mortgage workflow' : 'Loan workflow'}
              </h2>
              <Suspense fallback={<EmbeddedWorkflowFallback />}>
                {isMortgage ? (
                  <MortgagePendingThreadScreen application={storefrontApplication} embedded />
                ) : (
                  <LoanPendingThreadScreen application={storefrontApplication} embedded />
                )}
              </Suspense>
            </section>
          ) : !showAmortization && product.requirements?.length ? (
            <section>
              <h2 className="mb-3 text-sm font-bold sf-text-ink">Requirements</h2>
              <div className="space-y-2">
                {product.requirements.map((requirement, index) => (
                  <div
                    key={`${requirement.requirementType || 'requirement'}-${index}`}
                    className="sf-accent-soft rounded-xl px-4 py-3"
                  >
                    <p className="text-xs font-semibold sf-text-ink">
                      {requirement.requirementType || requirement.contentType || 'Requirement'}
                    </p>
                    {requirement.description ? (
                      <p className="mt-1 text-xs leading-5 text-gray-500">{requirement.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {product.termsAndCondition ? (
            <section className="sf-accent-soft rounded-2xl px-4 py-4">
              <h2 className="text-sm font-bold sf-text-ink">Terms and conditions</h2>
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-gray-500">
                {product.termsAndCondition}
              </p>
            </section>
          ) : null}
        </div>
      )}
    </MobileFlowShell>
  )
}
