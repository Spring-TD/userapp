'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserWallet } from '@/hooks/useUserWallet'
import { fetchMobileProductById } from '@/lib/fetchMobileProductById'
import { fetchUserProductApplications } from '@/lib/services/productApplicationApi'
import type { MobileProduct } from '@/lib/storefrontProducts'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function formatAmount(value: number | undefined, currency: string): string | null {
  return value == null ? null : formatWalletBalance(value, currency)
}

function productFacts(product: MobileProduct, currency: string): Array<[string, string]> {
  const amountRange =
    product.amountMin != null || product.amountMax != null
      ? [formatAmount(product.amountMin, currency), formatAmount(product.amountMax, currency)]
          .filter(Boolean)
          .join(' – ')
      : null

  return [
    ['Product type', product.type],
    ['Product category', product.subType || ''],
    ['Amount range', amountRange || ''],
    ['Interest rate', product.interestRate || ''],
    ['Interest method', product.interestMethod || ''],
    ['Duration', product.duration || ''],
    ['Repayment frequency', product.repaymentFrequency || ''],
    ['Withdrawal flexibility', product.withdrawalFlexibility || ''],
    ['Price', formatAmount(product.price, currency) || ''],
    ['Minimum quantity', product.minimumQuantity != null ? String(product.minimumQuantity) : ''],
    ['Unit', product.unitOfMeasure || ''],
    ['Return on investment', product.roi || ''],
  ].filter((row): row is [string, string] => Boolean(row[1]))
}

export default function AppliedProductDetailPage() {
  const params = useParams<{ applicationId: string }>()
  const applicationId = params.applicationId
  const { wallet, loading: walletLoading } = useUserWallet()
  const [application, setApplication] = useState<ProductApplication | null>(null)
  const [product, setProduct] = useState<MobileProduct | null>(null)
  const [loading, setLoading] = useState(true)
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

      const applicationResult = await fetchUserProductApplications(userId)
      if (cancelled) return

      const matchedApplication =
        applicationResult.applications.find((item) => item.id === applicationId) ?? null
      if (applicationResult.error || !matchedApplication) {
        setError(applicationResult.error || 'This product application was not found.')
        setLoading(false)
        return
      }

      setApplication(matchedApplication)

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

  const currency = wallet?.currency || 'NGN'
  const facts = product ? productFacts(product, currency) : []

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
            {product.description ? (
              <p className="mt-3 text-sm leading-6 text-white/80">{product.description}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border sf-border-subtle px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">Application reference</p>
                <p className="mt-1 break-all text-sm font-semibold sf-text-ink">{application.id}</p>
              </div>
              <span className="sf-accent-soft shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold sf-text-ink">
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
                    <dd className="max-w-[58%] text-right text-xs font-semibold sf-text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {product.requirements?.length ? (
            <section>
              <h2 className="mb-3 text-sm font-bold sf-text-ink">Requirements</h2>
              <div className="space-y-2">
                {product.requirements.map((requirement, index) => (
                  <div key={`${requirement.requirementType || 'requirement'}-${index}`} className="sf-accent-soft rounded-xl px-4 py-3">
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
