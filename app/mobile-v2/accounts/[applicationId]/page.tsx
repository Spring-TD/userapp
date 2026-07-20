'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { useUserWallet } from '@/hooks/useUserWallet'
import { resolveUserProductApplication } from '@/lib/services/productApplicationApi'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function accountNumberFor(application: ProductApplication | null): string {
  return application?.productWallet?.upstreamAccount?.accountNumber?.trim() || ''
}

export default function AccountDetailPage() {
  const params = useParams<{ applicationId: string }>()
  const applicationId = decodeURIComponent(String(params.applicationId || ''))
  const { wallet, loading: walletLoading } = useUserWallet()
  const [applications, setApplications] = useState<ProductApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<ProductApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (walletLoading) {
      setLoading(true)
      return
    }

    const userId = wallet?.userId
    if (!userId) {
      setApplications([])
      setSelectedApplication(null)
      setError('Unable to verify your account.')
      setLoading(false)
      return
    }

    if (!applicationId) {
      setApplications([])
      setSelectedApplication(null)
      setError('Account record not found.')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void resolveUserProductApplication(userId, applicationId).then((result) => {
      if (cancelled) return
      setSelectedApplication(result.application)
      setApplications(result.applications)
      setError(result.application ? null : result.error || 'Account record not found.')
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [applicationId, wallet?.userId, walletLoading])

  const relatedApplications = useMemo(() => {
    const accountNumber = accountNumberFor(selectedApplication)
    if (!accountNumber) {
      return selectedApplication ? [selectedApplication] : []
    }
    const related = applications.filter(
      (application) => accountNumberFor(application) === accountNumber,
    )
    if (related.length > 0) return related
    return selectedApplication ? [selectedApplication] : []
  }, [applications, selectedApplication])

  const account = selectedApplication?.productWallet?.upstreamAccount
  const accountNumber = account?.accountNumber?.trim() || ''

  const copyAccountNumber = async () => {
    if (!accountNumber) return
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(true)
      toast.success('Account number copied')
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Unable to copy account number')
    }
  }

  return (
    <MobileFlowShell title="Account products">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl bg-gray-200/90" />
          <Skeleton className="h-20 w-full rounded-2xl bg-gray-200/90" />
          <Skeleton className="h-20 w-full rounded-2xl bg-gray-200/90" />
        </div>
      ) : error || !selectedApplication ? (
        <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center text-sm text-gray-500">
          {error || 'Account record not found.'}
        </div>
      ) : (
        <>
          <div className="sf-bg-button rounded-2xl px-5 py-5 text-white">
            <p className="text-xs text-white/70">Account number</p>
            <div className="mt-1 flex items-center gap-3">
              <p className="min-w-0 flex-1 break-all text-lg font-bold">{accountNumber || '—'}</p>
              {accountNumber ? (
                <button
                  type="button"
                  onClick={() => void copyAccountNumber()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Copy account number"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-white/80">{account?.bankName || 'Provider bank'}</p>
            <p className="mt-1 text-xs text-white/60">
              {relatedApplications.length} product{relatedApplications.length === 1 ? '' : 's'} running on this
              account
            </p>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-bold sf-text-ink">Products on this account</h2>
          <div className="space-y-3">
            {relatedApplications.map((application) => (
              <div key={application.id} className="rounded-2xl border sf-border-subtle px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold sf-text-ink">
                      {application.productName || application.productType}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{application.productType}</p>
                  </div>
                  <span className="sf-accent-soft rounded-full px-2.5 py-1 text-[10px] font-semibold sf-text-ink">
                    {application.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {(application as { amount?: number }).amount != null
                      ? formatWalletBalance((application as { amount?: number }).amount!, wallet?.currency)
                      : 'Active product'}
                  </span>
                  <Link
                    href={`/mobile-v2/accounts/${encodeURIComponent(application.id)}/product`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold sf-text-button"
                  >
                    Open product
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </MobileFlowShell>
  )
}
