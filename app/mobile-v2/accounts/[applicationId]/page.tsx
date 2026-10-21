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
import {
  canTransferProductWalletToPrimary,
  isApplicationDisbursedForWallet,
  mergeDisbursementSignals,
  productWalletAvailableBalance,
  shouldShowTransferredToPrimary,
  withZeroProductWallet,
} from '@/lib/productWalletTransfer'
import { resolveUserProductApplication } from '@/lib/services/productApplicationApi'
import { fetchApplicationById } from '@/lib/storefrontApplicationClient'
import { formatWalletBalance } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'

function accountNumberFor(application: ProductApplication | null): string {
  return application?.productWallet?.upstreamAccount?.accountNumber?.trim() || ''
}

function normalizeStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
}

function isApprovedStatus(status?: string | null): boolean {
  const s = normalizeStatus(status)
  return s.includes('approv') || s.includes('disburs') || s.includes('active')
}

function formatStatusLabel(status?: string | null): string {
  const raw = String(status || 'Approved').trim()
  if (!raw) return 'Approved'
  return raw
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/** Prefer Disbursed when PAF/schedule says so — top-level status often stays APPROVED. */
function applicationDisplayStatus(application: ProductApplication): string {
  if (isApplicationDisbursedForWallet(application)) return 'Disbursed'
  return formatStatusLabel(application.status)
}

function statusBadgeTone(status?: string | null): string {
  const s = normalizeStatus(status)
  if (s.includes('pending') || s.includes('review') || s.includes('draft')) {
    return 'bg-orange-100 text-orange-700'
  }
  if (s.includes('active')) return 'bg-emerald-600 text-white'
  if (s.includes('disburs') || s.includes('complete')) return 'bg-teal-600 text-white'
  if (s.includes('approved')) return 'bg-[var(--sf-button,#1E40AF)] text-white'
  if (s.includes('reject') || s.includes('cancel')) return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function canTransferApplication(application: ProductApplication): boolean {
  return canTransferProductWalletToPrimary(application)
}

function applicationUpdatedAt(application: ProductApplication): number {
  const raw =
    (application as { updatedAt?: string }).updatedAt ||
    (application as { createdAt?: string }).createdAt ||
    ''
  const ts = Date.parse(String(raw))
  return Number.isFinite(ts) ? ts : 0
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
    void Promise.all([
      resolveUserProductApplication(userId, applicationId),
      fetchApplicationById(applicationId),
    ]).then(async ([resolved, byId]) => {
      let application = resolved.application
      if (application && byId.ok && byId.application) {
        application = mergeDisbursementSignals(application, byId.application)
        if (byId.application.productWallet) {
          application = { ...application, productWallet: byId.application.productWallet }
        }
      }
      setSelectedApplication(application)

      let list = resolved.applications
      const needsEnrichment = list.filter((app) => {
        const type = String(app.productType || '').toUpperCase()
        if (type !== 'LOAN' && type !== 'MORTGAGE') return false
        return !isApplicationDisbursedForWallet(app)
      })
      if (needsEnrichment.length > 0) {
        const enriched = await Promise.all(
          needsEnrichment.map(async (app) => {
            const detail = await fetchApplicationById(app.id)
            if (!detail.ok || !detail.application) return app
            return mergeDisbursementSignals(app, detail.application)
          }),
        )
        const byEnrichedId = new Map(enriched.map((app) => [app.id, app]))
        list = list.map((app) => byEnrichedId.get(app.id) ?? app)
      }
      setApplications(list)
      setError(application ? null : resolved.error || 'Account record not found.')
    })
    void refetchWallet()
  }, [applicationId, wallet?.userId, refetchWallet])

  const handleTransferSuccess = useCallback(
    (applicationIdTransferred: string) => {
      setSelectedApplication((prev) =>
        prev ? withZeroProductWallet(prev, applicationIdTransferred) : prev,
      )
      setApplications((prev) => prev.map((app) => withZeroProductWallet(app, applicationIdTransferred)))
      setTransferTarget(null)
      reload()
    },
    [reload],
  )

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

    void Promise.all([
      resolveUserProductApplication(userId, applicationId),
      fetchApplicationById(applicationId),
    ]).then(async ([resolved, byId]) => {
      if (cancelled) return
      let application = resolved.application
      if (application && byId.ok && byId.application) {
        application = mergeDisbursementSignals(application, byId.application)
        if (byId.application.productWallet) {
          application = { ...application, productWallet: byId.application.productWallet }
        }
      }
      setSelectedApplication(application)

      let list = resolved.applications
      const needsEnrichment = list.filter((app) => {
        const type = String(app.productType || '').toUpperCase()
        if (type !== 'LOAN' && type !== 'MORTGAGE') return false
        return !isApplicationDisbursedForWallet(app)
      })
      if (needsEnrichment.length > 0) {
        const enriched = await Promise.all(
          needsEnrichment.map(async (app) => {
            const detail = await fetchApplicationById(app.id)
            if (!detail.ok || !detail.application) return app
            return mergeDisbursementSignals(app, detail.application)
          }),
        )
        if (cancelled) return
        const byEnrichedId = new Map(enriched.map((app) => [app.id, app]))
        list = list.map((app) => byEnrichedId.get(app.id) ?? app)
      }
      setApplications(list)
      setError(application ? null : resolved.error || 'Account record not found.')
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [applicationId, wallet?.userId, walletLoading])

  const relatedApplications = useMemo(() => {
    const accountNumber = accountNumberFor(selectedApplication)
    const productType = String(selectedApplication?.productType || '').toUpperCase()

    let related: ProductApplication[] = []
    if (accountNumber) {
      related = applications.filter((application) => accountNumberFor(application) === accountNumber)
    }

    // Always include approved products of the same type (covers approved loans before NUBAN is ready).
    if (productType) {
      const approvedSameType = applications.filter(
        (application) =>
          String(application.productType || '').toUpperCase() === productType &&
          isApprovedStatus(application.status),
      )
      const byId = new Map<string, ProductApplication>()
      for (const app of [...related, ...approvedSameType]) {
        if (app.id) byId.set(app.id, app)
      }
      if (selectedApplication?.id) byId.set(selectedApplication.id, selectedApplication)
      related = Array.from(byId.values())
    }

    if (related.length === 0 && selectedApplication) related = [selectedApplication]

    return related.sort((a, b) => {
      const aApproved = isApprovedStatus(a.status) ? 1 : 0
      const bApproved = isApprovedStatus(b.status) ? 1 : 0
      if (bApproved !== aApproved) return bApproved - aApproved
      return applicationUpdatedAt(b) - applicationUpdatedAt(a)
    })
  }, [applications, selectedApplication])

  const approvedLoans = useMemo(
    () =>
      relatedApplications.filter(
        (application) =>
          String(application.productType || '').toUpperCase() === 'LOAN' &&
          isApprovedStatus(application.status),
      ),
    [relatedApplications],
  )

  const listTitle = useMemo(() => {
    const types = new Set(
      relatedApplications.map((application) => String(application.productType || '').toUpperCase()),
    )
    if (types.size === 1 && types.has('LOAN')) return 'Approved loans'
    if (types.size === 1 && types.has('MORTGAGE')) return 'Approved mortgages'
    if (types.size === 1 && types.has('SAVINGS')) return 'Approved savings'
    return 'Products on this account'
  }, [relatedApplications])

  const account = selectedApplication?.productWallet?.upstreamAccount
  const accountNumber = account?.accountNumber?.trim() || ''
  const productCountLabel =
    relatedApplications.length === 1
      ? '1 Product linked to this account'
      : `${relatedApplications.length} Products linked to this account`

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
            <p className="mt-1 text-xs text-white/60">{productCountLabel}</p>
          </div>

          <h2 className="mb-3 mt-6 text-sm font-bold sf-text-ink">{listTitle}</h2>
          {approvedLoans.length > 0 && listTitle !== 'Approved loans' ? (
            <p className="mb-3 text-xs text-gray-500">
              {approvedLoans.length === 1
                ? '1 Approved loan on this account'
                : `${approvedLoans.length} Approved loans on this account`}
            </p>
          ) : null}
          <div className="space-y-3">
            {relatedApplications.map((application) => {
              const balance = productWalletAvailableBalance(application)
              const transferable = Boolean(wallet?.userId && canTransferApplication(application))
              const showTransferredState =
                Boolean(wallet?.userId) && shouldShowTransferredToPrimary(application)
              const statusLabel = applicationDisplayStatus(application)
              return (
                <div key={application.id} className="rounded-2xl border sf-border-subtle px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold sf-text-ink">
                        {application.productName || application.productType || 'Product'}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                        {application.productType || 'Product'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${statusBadgeTone(statusLabel)}`}
                    >
                      {statusLabel}
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
                    <>
                      <Button
                        type="button"
                        onClick={() => setTransferTarget(application)}
                        className="mt-3 h-10 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
                      >
                        Transfer to primary wallet
                      </Button>
                      <p className="mt-2 text-center text-[11px] text-gray-500">
                        Available: {formatWalletBalance(balance, application.currency || wallet?.currency)}
                      </p>
                    </>
                  ) : showTransferredState ? (
                    <Button
                      type="button"
                      disabled
                      className="mt-3 h-10 w-full cursor-not-allowed rounded-full bg-gray-100 text-sm font-semibold text-gray-400"
                    >
                      Transferred to primary wallet
                    </Button>
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
                handleTransferSuccess(transferTarget.id)
              }}
            />
          ) : null}
        </>
      )}
    </MobileFlowShell>
  )
}
