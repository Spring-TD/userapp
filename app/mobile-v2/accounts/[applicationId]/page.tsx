'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useUserWallet } from '@/hooks/useUserWallet'
import { fetchUserProductApplications } from '@/lib/services/productApplicationApi'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function accountNumberFor(application: ProductApplication | null): string {
  return application?.productWallet?.upstreamAccount?.accountNumber?.trim() || ''
}

export default function AccountDetailPage() {
  const router = useRouter()
  const params = useParams<{ applicationId: string }>()
  const applicationId = params.applicationId
  const { wallet } = useUserWallet()
  const [applications, setApplications] = useState<ProductApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = wallet?.userId
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    void fetchUserProductApplications(userId).then((result) => {
      if (cancelled) return
      setApplications(result.applications)
      setError(result.error)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [wallet?.userId])

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === applicationId) ?? null,
    [applications, applicationId],
  )

  const relatedApplications = useMemo(() => {
    const accountNumber = accountNumberFor(selectedApplication)
    if (!accountNumber) {
      return selectedApplication ? [selectedApplication] : []
    }
    return applications.filter(
      (application) => accountNumberFor(application) === accountNumber,
    )
  }, [applications, selectedApplication])

  const account = selectedApplication?.productWallet?.upstreamAccount

  return (
    <div className="min-h-full bg-[#F5F6FB] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex h-[102px] items-end justify-between bg-[#F4F6FF] px-7 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#111827] shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="pb-1 text-[15px] font-semibold text-[#111827]">Account products</h1>
        <div className="h-8 w-8" />
      </header>

      <main className="-mt-1 rounded-t-[8px] bg-white px-6 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#E5E7EB]" />

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl bg-gray-200/90" />
            <Skeleton className="h-20 w-full rounded-2xl bg-gray-200/90" />
            <Skeleton className="h-20 w-full rounded-2xl bg-gray-200/90" />
          </div>
        ) : error || !selectedApplication ? (
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#6B7280]">
            {error || 'Account record not found.'}
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-[#111827] px-5 py-5 text-white">
              <p className="text-xs text-white/70">Account number</p>
              <p className="mt-1 text-lg font-bold">{account?.accountNumber || '—'}</p>
              <p className="mt-3 text-sm text-white/80">{account?.bankName || 'Provider bank'}</p>
              <p className="mt-1 text-xs text-white/60">
                {relatedApplications.length} product{relatedApplications.length === 1 ? '' : 's'} running on this account
              </p>
            </div>

            <h2 className="mb-3 mt-6 text-sm font-bold text-[#111827]">Products on this account</h2>
            <div className="space-y-3">
              {relatedApplications.map((application) => (
                <div key={application.id} className="rounded-2xl border border-[#EEF0F6] px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">
                        {application.productName || application.productType}
                      </p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">{application.productType}</p>
                    </div>
                    <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[10px] font-semibold text-[#111827]">
                      {application.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#6B7280]">
                    <span>
                      {(application as { amount?: number }).amount != null
                        ? formatWalletBalance((application as { amount?: number }).amount!, wallet?.currency)
                        : 'Active product'}
                    </span>
                    <Link href={`/mobile-v2/products/${String(application.productType || '').toLowerCase()}`} className="font-semibold text-[#4F46E5]">
                      Open product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
