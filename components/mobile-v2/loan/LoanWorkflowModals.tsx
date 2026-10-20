'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Landmark, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CopyableDetailRow } from '@/components/mobile-v2/CopyableDetailRow'
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile'
import { useUserWallet } from '@/hooks/useUserWallet'
import { getAccessToken } from '@/lib/cookieAuth'
import { buildLoanApplicationDetails } from '@/lib/loanApplicationDetails'
import { type LoanWorkflowModal } from '@/lib/loanWorkflow'
import { extractOfferLetterFromRecord } from '@/lib/offerLetter'
import {
  formatLoanTermValue,
  hasLoanOfferLetterPdf,
  isLoanOfferLetterSent,
  loanApprovedAmount,
  loanDownPaymentDue,
  OFFER_LETTER_NOT_SENT_MESSAGE,
  pendingApprovedLoanApi,
  type InsufficientCentralWalletBalance,
  type PendingApprovedLoanDetail,
  type PendingApprovedLoanTerms,
} from '@/lib/pendingApprovedLoanApi'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { fetchUserWallet } from '@/lib/services/userWalletApi'
import type { MobileProduct } from '@/lib/storefrontProducts'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  formatWalletBalance,
  isVirtualNubanActive,
  walletSpendableBalance,
} from '@/lib/userWallet'
import { cn } from '@/lib/utils'

type LoanWorkflowModalsProps = {
  active: LoanWorkflowModal | null
  onClose: () => void
  application: StorefrontApplication
  applicationId: string
  product?: MobileProduct | null
  providerName?: string
  onStepAdvanced: () => void
}

type AcceptView = 'offer' | 'fund_wallet'

function triggerDownload(filename: string, url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

function displayNameFromProfile(user: {
  first_name?: string | null
  last_name?: string | null
} | null): string {
  if (!user) return ''
  const first = (user.first_name || '').trim()
  const last = (user.last_name || '').trim()
  if (first && last) return `${first} ${last}`
  return first || last || ''
}

function buildOfferTermRows(
  detail: PendingApprovedLoanDetail | null,
  fallback: ReturnType<typeof buildLoanApplicationDetails>,
): Array<[string, string]> {
  const terms: PendingApprovedLoanTerms | null | undefined = detail?.terms
  const currency = detail?.currency || 'NGN'
  const rows: Array<[string, string | null]> = [
    [
      'Approved amount',
      formatLoanTermValue(terms?.approvedAmount ?? loanApprovedAmount(detail), { currency }),
    ],
    ['Down payment due', formatLoanTermValue(terms?.downPaymentDue, { currency })],
    ['Interest rate', formatLoanTermValue(terms?.interestRate, { suffix: '%' })],
    ['Total repayable', formatLoanTermValue(terms?.totalRepayable, { currency })],
    ['Repayment frequency', formatLoanTermValue(terms?.repaymentFrequency)],
    [
      'Tenor',
      typeof terms?.tenorMonths === 'number' && Number.isFinite(terms.tenorMonths)
        ? `${terms.tenorMonths} month${terms.tenorMonths === 1 ? '' : 's'}`
        : null,
    ],
    ['Automatic repayment', formatLoanTermValue(terms?.automaticRepayment)],
    [
      'Est. disbursement',
      terms?.estimatedDisbursementDate
        ? (() => {
            try {
              return new Date(terms.estimatedDisbursementDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            } catch {
              return terms.estimatedDisbursementDate
            }
          })()
        : null,
    ],
    ['Loan ID', fallback.loanId],
    ['Status', fallback.status],
  ]

  return rows.filter((row): row is [string, string] => Boolean(row[1]))
}

export function LoanWorkflowModals({
  active,
  onClose,
  application,
  applicationId,
  product,
  providerName,
  onStepAdvanced,
}: LoanWorkflowModalsProps) {
  const { user: profile } = useAuthUserProfile()
  const { wallet, formattedBalance, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null)
  const [resolvingUserId, setResolvingUserId] = useState(false)
  const [busy, setBusy] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [offerDetail, setOfferDetail] = useState<PendingApprovedLoanDetail | null>(null)
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | null>(null)
  const [offerPdfName, setOfferPdfName] = useState<string | null>(null)
  const [acceptView, setAcceptView] = useState<AcceptView>('offer')
  const [insufficient, setInsufficient] = useState<InsufficientCentralWalletBalance | null>(null)

  const syncUserId = useMemo(() => {
    const candidates = [
      wallet?.userId,
      application.userId,
      profile?.id,
      (profile as { _id?: string } | null)?._id,
    ]
    for (const value of candidates) {
      const id = String(value || '').trim()
      if (id) return id
    }
    return null
  }, [wallet?.userId, application.userId, profile])

  const userId = resolvedUserId || syncUserId

  const details = buildLoanApplicationDetails(application, { product, providerName })
  const approvedFromDetail = loanApprovedAmount(offerDetail)
  const approvedDisplay =
    approvedFromDetail != null
      ? formatWalletBalance(approvedFromDetail, offerDetail?.currency || application.currency || 'NGN')
      : typeof application.amount === 'number'
        ? formatWalletBalance(application.amount, application.currency || 'NGN')
        : details.loanAmount

  const downPaymentDue = loanDownPaymentDue(offerDetail)
  const currency = offerDetail?.currency || application.currency || 'NGN'
  const centralBalance = walletSpendableBalance(wallet)
  const offerLetterSent = isLoanOfferLetterSent(offerDetail)
  const offerLetterPdfAvailable = hasLoanOfferLetterPdf(offerDetail) || Boolean(offerPdfUrl)
  const termRows = useMemo(
    () => buildOfferTermRows(offerDetail, details),
    [offerDetail, details],
  )

  const nuban = wallet?.virtualNuban
  const nubanReady = isVirtualNubanActive(wallet)
  const accountHolder = wallet?.name || displayNameFromProfile(profile) || '—'

  const ensureUserId = useCallback(async (): Promise<string | null> => {
    if (userId) return userId
    setResolvingUserId(true)
    try {
      const resolved = await resolveWalletUserId(syncUserId)
      const id = resolved?.trim() || null
      if (id) setResolvedUserId(id)
      return id
    } finally {
      setResolvingUserId(false)
    }
  }, [userId, syncUserId])

  const loadOfferDetail = useCallback(
    async (explicitUserId?: string | null) => {
      const id = String(explicitUserId || userId || '').trim()
      if (!id || !applicationId) return
      setDetailLoading(true)
      const res = await pendingApprovedLoanApi.getDetail(applicationId, id)
      setDetailLoading(false)
      if (!res.ok) {
        toast.error(res.error || 'Could not load offer details.')
        return
      }
      setOfferDetail(res.data)
      const letter = extractOfferLetterFromRecord(res.data as unknown as Record<string, unknown>)
      if (letter?.pdfUrl) {
        setOfferPdfUrl(letter.pdfUrl)
        setOfferPdfName(letter.pdfFileName || null)
      } else {
        setOfferPdfUrl(null)
        setOfferPdfName(null)
      }
    },
    [applicationId, userId],
  )

  useEffect(() => {
    if (!active) return
    if (userId) return
    let cancelled = false
    setResolvingUserId(true)
    void resolveWalletUserId(syncUserId).then((resolved) => {
      if (cancelled) return
      const id = resolved?.trim() || null
      if (id) setResolvedUserId(id)
      setResolvingUserId(false)
    })
    return () => {
      cancelled = true
    }
  }, [active, userId, syncUserId])

  useEffect(() => {
    if (!active || !userId || !applicationId) return
    if (active !== 'approved' && active !== 'accept_offer') return

    setAcceptView('offer')
    setInsufficient(null)
    void loadOfferDetail(userId)
  }, [active, applicationId, userId, loadOfferDetail])

  if (!active) return null

  const markOfferAccepted = () => {
    onStepAdvanced()
  }

  const acknowledgeApproval = () => {
    onStepAdvanced()
    toast.success('Approval reviewed')
    onClose()
  }

  const showFundWallet = (info: InsufficientCentralWalletBalance) => {
    setInsufficient(info)
    setAcceptView('fund_wallet')
  }

  const payDownPayment = async (forUserId: string): Promise<boolean> => {
    if (!forUserId || busy) return false
    setBusy(true)
    try {
      const apiRes = await pendingApprovedLoanApi.payDownPayment(applicationId, forUserId, 'wallet')
      if (!apiRes.ok) {
        if (apiRes.insufficient) {
          showFundWallet(apiRes.insufficient)
          return false
        }
        toast.error(apiRes.error || 'Could not pay down payment. Please try again.')
        return false
      }
      // Down-payment endpoint already accepts the offer — do not call /offer again.
      markOfferAccepted()
      void refetchWallet()
      toast.success('Down payment paid — offer accepted')
      onClose()
      return true
    } finally {
      setBusy(false)
    }
  }

  const acceptOfferOnly = async (forUserId: string): Promise<boolean> => {
    if (!forUserId || busy) return false
    setBusy(true)
    try {
      const apiRes = await pendingApprovedLoanApi.respondToOffer(applicationId, forUserId, true)
      if (!apiRes.ok) {
        const message = apiRes.error || 'Could not accept offer. Please try again.'
        if (message.toLowerCase().includes(OFFER_LETTER_NOT_SENT_MESSAGE.toLowerCase())) {
          toast.error(
            'The offer letter PDF may be available to preview, but the merchant has not formally sent it yet. Ask them to Generate / Send the offer letter on their dashboard, then try again.',
          )
          await loadOfferDetail(forUserId)
          return false
        }
        toast.error(message)
        return false
      }
      markOfferAccepted()
      toast.success('Loan offer accepted')
      onClose()
      return true
    } finally {
      setBusy(false)
    }
  }

  const handleAcceptOrPay = async () => {
    if (busy || resolvingUserId) {
      toast.message('Preparing your session…')
      return
    }

    const forUserId = await ensureUserId()
    if (!forUserId) {
      if (getAccessToken()) {
        toast.error('Could not verify your account. Pull to refresh and try again.')
      } else {
        toast.error('Sign in to accept this offer.')
      }
      return
    }

    if (detailLoading) {
      toast.message('Loading offer details…')
      return
    }

    let detail = offerDetail
    if (!detail) {
      toast.message('Loading offer details…')
      await loadOfferDetail(forUserId)
      // Re-read after load — state update is async, so fetch once more from API for this click.
      const refreshed = await pendingApprovedLoanApi.getDetail(applicationId, forUserId)
      if (!refreshed.ok || !refreshed.data) {
        toast.error(refreshed.ok === false ? refreshed.error : 'Could not load offer details.')
        return
      }
      detail = refreshed.data
      setOfferDetail(detail)
      const letter = extractOfferLetterFromRecord(detail as unknown as Record<string, unknown>)
      if (letter?.pdfUrl) {
        setOfferPdfUrl(letter.pdfUrl)
        setOfferPdfName(letter.pdfFileName || null)
      }
    }

    if (!isLoanOfferLetterSent(detail)) {
      toast.error(
        hasLoanOfferLetterPdf(detail) || Boolean(offerPdfUrl)
          ? 'A letter PDF is available to preview, but it has not been formally sent yet. Ask the merchant to Generate / Send the offer letter, then retry.'
          : 'Offer letter has not been sent by the merchant yet.',
      )
      await loadOfferDetail(forUserId)
      return
    }

    const due = loanDownPaymentDue(detail)
    // Balance check only matters when a down payment is due.
    if (due > 0) {
      let available = walletSpendableBalance(wallet)
      if (walletLoading || available < due) {
        const fresh = await fetchUserWallet(forUserId)
        if (fresh.wallet) {
          available = walletSpendableBalance(fresh.wallet)
          void refetchWallet()
        }
      }
      if (available < due) {
        showFundWallet({
          code: 'INSUFFICIENT_CENTRAL_WALLET_BALANCE',
          requiredAmount: due,
          availableBalance: available,
          currency: detail.currency || currency,
          shortfall: Math.max(0, due - available),
          error: 'Insufficient balance in user wallet for repayment collection',
        })
        return
      }
      await payDownPayment(forUserId)
      return
    }

    // No down payment due — accept via /offer only.
    await acceptOfferOnly(forUserId)
  }

  const declineOffer = async () => {
    if (busy || resolvingUserId) return
    const forUserId = await ensureUserId()
    if (!forUserId) {
      if (getAccessToken()) {
        toast.error('Could not verify your account. Pull to refresh and try again.')
      } else {
        toast.error('Sign in to decline this offer.')
      }
      return
    }
    setBusy(true)
    try {
      const apiRes = await pendingApprovedLoanApi.respondToOffer(applicationId, forUserId, false)
      if (!apiRes.ok) {
        toast.error(apiRes.error || 'Could not decline offer. Please try again.')
        return
      }
      onStepAdvanced()
      toast.message('Loan offer declined')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleRetryAfterFunding = async () => {
    if (busy) return
    const forUserId = await ensureUserId()
    if (!forUserId) {
      toast.error('Could not verify your account. Please try again.')
      return
    }
    await refetchWallet()
    await payDownPayment(forUserId)
  }

  const sessionBusy = busy || resolvingUserId || (walletLoading && !userId)
  const primaryCtaLabel =
    downPaymentDue > 0
      ? busy
        ? 'Paying…'
        : `Pay ${formatWalletBalance(downPaymentDue, currency)} & accept`
      : busy
        ? 'Saving…'
        : 'Accept offer'

  return (
    <div className="absolute inset-0 z-[80] flex items-end">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[81] max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-white px-5 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-300" />

        {active === 'approved' ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Loan status</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--sf-ink,#1E293B)]">Loan approved</h2>
              <p className="mt-2 text-sm text-gray-500">
                Your loan application has been approved. Continue to review and accept the offer.
              </p>
            </div>

            <div className="rounded-2xl sf-accent-soft px-4 py-4">
              <p className="text-xs text-gray-500">Approved amount</p>
              <p className="mt-1 text-xl font-bold text-[var(--sf-button,#1E40AF)]">
                {detailLoading ? '…' : approvedDisplay}
              </p>
              <p className="mt-3 text-xs text-gray-500">Status</p>
              <p className="mt-1 text-sm font-semibold text-orange-600">
                {offerDetail?.postApprovalFulfillment?.status
                  ? String(offerDetail.postApprovalFulfillment.status).replace(/_/g, ' ')
                  : details.status}
              </p>
            </div>

            {offerPdfUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => triggerDownload(offerPdfName || 'loan-offer-letter.pdf', offerPdfUrl)}
                className="h-11 w-full rounded-full border-gray-200 text-sm font-semibold"
              >
                <Download className="mr-2 h-4 w-4" />
                Preview offer letter
              </Button>
            ) : null}

            <Button
              type="button"
              onClick={acknowledgeApproval}
              className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
            >
              Continue to accept offer
            </Button>
          </div>
        ) : acceptView === 'fund_wallet' && insufficient ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Fund wallet
                </p>
                <h2 className="mt-1 text-lg font-bold text-[var(--sf-ink,#1E293B)]">
                  Top up your central wallet
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Transfer at least the shortfall to your NGN account, wait for it to reflect, then
                  retry the down payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAcceptView('offer')
                  setInsufficient(null)
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Back to offer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex justify-between gap-3">
                <span>Required</span>
                <span className="font-semibold">
                  {formatWalletBalance(insufficient.requiredAmount, insufficient.currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-3">
                <span>Available</span>
                <span className="font-semibold">
                  {formatWalletBalance(insufficient.availableBalance, insufficient.currency)}
                </span>
              </div>
              <div className="mt-1 flex justify-between gap-3 border-t border-amber-200/80 pt-1">
                <span>Shortfall</span>
                <span className="font-bold">
                  {formatWalletBalance(insufficient.shortfall, insufficient.currency)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl sf-page-bg-tint px-4 py-3">
              <p className="text-xs text-gray-500">Central wallet balance</p>
              <p className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">
                {walletLoading ? '…' : formattedBalance}
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">
                <Landmark className="h-4 w-4 text-[var(--sf-primary,#2563EB)]" />
                Fund via bank transfer
              </div>
              {walletLoading ? (
                <p className="text-sm text-gray-500">Loading account details…</p>
              ) : nubanReady ? (
                <>
                  <CopyableDetailRow label="Account Holder" value={accountHolder} />
                  <CopyableDetailRow label="Account Number" value={nuban?.accountNumber} />
                  <CopyableDetailRow label="Bank Name" value={nuban?.bankName} />
                </>
              ) : (
                <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  <p>Your bank transfer account is not active yet.</p>
                  <Link
                    href="/mobile-v2/profile/kyc/create"
                    className="mt-2 inline-flex text-sm font-semibold text-[var(--sf-button,#1E40AF)]"
                  >
                    Complete KYC
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#FEF3C7] px-4 py-3 text-[11px] leading-relaxed text-[#92400E]">
              Payments usually take a few minutes to reflect. Retries are safe — the backend will not
              debit twice for a successful payment.
            </div>

            <Button
              type="button"
              disabled={sessionBusy}
              onClick={() => void handleRetryAfterFunding()}
              className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrying…
                </span>
              ) : (
                'I’ve funded — retry payment'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Loan offer</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--sf-ink,#1E293B)]">
                {downPaymentDue > 0 ? 'Pay down payment & accept' : 'Accept offer'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {downPaymentDue > 0
                  ? 'Review the offer, then pay the required down payment from your central wallet. This also accepts the offer — disbursement is still done by the merchant.'
                  : 'Review the offer letter, then confirm this loan offer. Disbursement remains with the merchant.'}
              </p>
            </div>

            {!detailLoading && offerDetail && !offerLetterSent ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">Offer letter not formally sent yet</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                  {offerLetterPdfAvailable
                    ? 'You can preview a letter PDF, but acceptance stays locked until the merchant completes Generate / Send on their dashboard (that sets offer.sentAt).'
                    : 'The merchant still needs to generate or upload and send the offer letter before you can accept.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={sessionBusy || detailLoading}
                  onClick={() => void loadOfferDetail(userId)}
                  className="mt-3 h-9 rounded-full border-amber-300 bg-white text-xs font-semibold text-amber-950"
                >
                  Refresh status
                </Button>
              </div>
            ) : null}

            {offerPdfUrl ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => triggerDownload(offerPdfName || 'loan-offer-letter.pdf', offerPdfUrl)}
                className="h-11 w-full rounded-full border-gray-200 text-sm font-semibold"
              >
                <Download className="mr-2 h-4 w-4" />
                {offerLetterSent ? 'Download offer letter' : 'Preview offer letter'}
              </Button>
            ) : (
              <p className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                Offer letter PDF will appear here once the merchant has issued it.
              </p>
            )}

            {downPaymentDue > 0 ? (
              <div className="rounded-2xl sf-accent-soft px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">Down payment due</span>
                  <span className="font-bold text-[var(--sf-button,#1E40AF)]">
                    {formatWalletBalance(downPaymentDue, currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">Central wallet</span>
                  <span className="font-semibold text-[var(--sf-ink,#1E1B4B)]">
                    {walletLoading ? '…' : formattedBalance}
                  </span>
                </div>
                {!walletLoading && centralBalance < downPaymentDue ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Shortfall{' '}
                    {formatWalletBalance(downPaymentDue - centralBalance, currency)} — you’ll be
                    asked to fund your wallet.
                  </p>
                ) : null}
              </div>
            ) : null}

            <dl className="rounded-2xl border border-gray-100 px-4">
              {detailLoading && termRows.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500">Loading offer terms…</p>
              ) : (
                termRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0"
                  >
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="max-w-[58%] text-right text-xs font-semibold text-[var(--sf-ink,#1E293B)]">
                      {value}
                    </dd>
                  </div>
                ))
              )}
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                disabled={sessionBusy}
                onClick={() => void declineOffer()}
                className={cn(
                  'h-12 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50',
                )}
              >
                Decline
              </Button>
              <Button
                type="button"
                disabled={sessionBusy || detailLoading || (!!offerDetail && !offerLetterSent)}
                onClick={() => void handleAcceptOrPay()}
                className="h-12 rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {sessionBusy && !busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing…
                  </span>
                ) : busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {primaryCtaLabel}
                  </span>
                ) : offerDetail && !offerLetterSent ? (
                  'Waiting for letter'
                ) : (
                  primaryCtaLabel
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
