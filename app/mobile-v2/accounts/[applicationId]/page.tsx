'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { TransferToPrimaryDrawer } from '@/components/mobile-v2/TransferToPrimaryDrawer'
import { useUserWallet } from '@/hooks/useUserWallet'
import { resolveUserProductApplication } from '@/lib/services/productApplicationApi'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function accountNumberFor(application: ProductApplication | null): string {
  return application?.productWallet?.upstreamAccount?.accountNumber?.trim() || ''
}

function productWalletAvailableBalance(application: ProductApplication): number {
  const wallet = application.productWallet
  const upstream = wallet?.upstreamAccount
  const candidates = [
    wallet?.mainBalance,
    wallet?.balance,
    upstream?.mainBalance,
    upstream?.balance,
    application.amount,
  ]
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function canTransferApplication(application: ProductApplication): boolean {
  const type = String(application.productType || '').toUpperCase()
  if (type === 'COMMODITY') return false
  const status = String(application.status || '').toLowerCase()
  if (status.includes('reject') || status.includes('cancel') || status.includes('pending')) return false
  if (type === 'LOAN' || type === 'MORTGAGE') {
    return (
      status.includes('approv') ||
      status.includes('disburs') ||
      status.includes('active') ||
      productWalletAvailableBalance(application) > 0
    )
  }
  return productWalletAvailableBalance(application) > 0
}

export default function AccountDetailPage() {
  const params = useParams<{ applicationId: string }>()
  const applicationId = decodeURIComponent(String(params.applicationId || ''))
  const { wallet, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const [applications, setApplications] = useState<ProductApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<ProductApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [transferTarget, setTransferTarget] = useState<ProductApplication | null>(null)

  const reload = useCallback(() => {
    const userId = wallet?.userId
    if (!userId || !applicationId) return
    void resolveUserProductApplication(userId, applicationId).then((result) => {
      setSelectedApplication(result.application)
      setApplications(result.applications)
      setError(result.application ? null : result.error || 'Account record not found.')
    })
    void refetchWallet()
  }, [applicationId, wallet?.userId, refetchWallet])

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
            {relatedApplications.map((application) => {
              const transferable = Boolean(wallet?.userId && canTransferApplication(application))
              const balance = productWalletAvailableBalance(application)
              return (
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
                      {application.amount != null
                        ? formatWalletBalance(application.amount, wallet?.currency)
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
                  {transferable ? (
                    <Button
                      type="button"
                      onClick={() => setTransferTarget(application)}
                      className="mt-3 h-10 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
                    >
                      Transfer to primary wallet
                    </Button>
                  ) : null}
                  {transferable && balance > 0 ? (
                    <p className="mt-2 text-center text-[11px] text-gray-500">
                      Available: {formatWalletBalance(balance, application.currency || wallet?.currency)}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          {wallet?.userId && transferTarget ? (
            <TransferToPrimaryDrawer
              open={Boolean(transferTarget)}
              onOpenChange={(open) => {
                if (!open) setTransferTarget(null)
              }}
              userId={wallet.userId}
              applicationId={transferTarget.id}
              productName={transferTarget.productName}
              productType={transferTarget.productType}
              availableBalance={productWalletAvailableBalance(transferTarget)}
              currency={transferTarget.currency || wallet.currency || 'NGN'}
              onSuccess={() => {
                setTransferTarget(null)
                reload()
              }}
            />
          ) : null}
        </>
      )}
    </MobileFlowShell>
  )
}
