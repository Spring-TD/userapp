'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { patchLoanWorkflow, type LoanWorkflowModal } from '@/lib/loanWorkflow'
import { buildLoanApplicationDetails } from '@/lib/loanApplicationDetails'
import { extractOfferLetterFromRecord } from '@/lib/offerLetter'
import { pendingApprovedLoanApi } from '@/lib/pendingApprovedLoanApi'
import { useUserWallet } from '@/hooks/useUserWallet'
import type { MobileProduct } from '@/lib/storefrontProducts'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import { formatWalletBalance } from '@/lib/userWallet'
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

export function LoanWorkflowModals({
  active,
  onClose,
  application,
  applicationId,
  product,
  providerName,
  onStepAdvanced,
}: LoanWorkflowModalsProps) {
  const { wallet } = useUserWallet()
  const userId = wallet?.userId
  const [busy, setBusy] = useState(false)
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | null>(null)
  const [offerPdfName, setOfferPdfName] = useState<string | null>(null)
  const details = buildLoanApplicationDetails(application, { product, providerName })
  const amount =
    typeof application.amount === 'number'
      ? formatWalletBalance(application.amount, application.currency || 'NGN')
      : details.loanAmount

  useEffect(() => {
    if (!active || !userId || !applicationId) return
    if (active !== 'approved' && active !== 'accept_offer') return

    let cancelled = false
    void pendingApprovedLoanApi.getDetail(applicationId, userId).then((res) => {
      if (cancelled || !res.ok) return
      const letter = extractOfferLetterFromRecord(res.data as unknown as Record<string, unknown>)
      if (letter?.pdfUrl) {
        setOfferPdfUrl(letter.pdfUrl)
        setOfferPdfName(letter.pdfFileName || null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [active, applicationId, userId])

  if (!active) return null

  const acknowledgeApproval = () => {
    patchLoanWorkflow(applicationId, { approvalAcknowledged: true })
    onStepAdvanced()
    toast.success('Approval reviewed')
    onClose()
  }

  const acceptOffer = async () => {
    if (!userId) {
      toast.error('Sign in to accept this offer.')
      return
    }
    setBusy(true)
    try {
      const apiRes = await pendingApprovedLoanApi.respondToOffer(applicationId, userId, true)
      if (!apiRes.ok) {
        toast.error(apiRes.error || 'Could not accept offer. Please try again.')
        return
      }
      patchLoanWorkflow(applicationId, {
        approvalAcknowledged: true,
        offerAccepted: true,
        offerDeclined: false,
      })
      onStepAdvanced()
      toast.success('Loan offer accepted')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const declineOffer = async () => {
    if (!userId) {
      toast.error('Sign in to decline this offer.')
      return
    }
    setBusy(true)
    try {
      const apiRes = await pendingApprovedLoanApi.respondToOffer(applicationId, userId, false)
      if (!apiRes.ok) {
        toast.error(apiRes.error || 'Could not decline offer. Please try again.')
        return
      }
      patchLoanWorkflow(applicationId, {
        offerAccepted: false,
        offerDeclined: true,
      })
      onStepAdvanced()
      toast.message('Loan offer declined')
      onClose()
    } finally {
      setBusy(false)
    }
  }

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
              <p className="mt-1 text-xl font-bold text-[var(--sf-button,#1E40AF)]">{amount}</p>
              <p className="mt-3 text-xs text-gray-500">Status</p>
              <p className="mt-1 text-sm font-semibold text-orange-600">{details.status}</p>
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
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Loan offer</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--sf-ink,#1E293B)]">Accept offer</h2>
              <p className="mt-2 text-sm text-gray-500">
                Review the offer letter, then confirm this loan offer to proceed to disbursement.
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
                Download offer letter
              </Button>
            ) : (
              <p className="rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                Offer letter PDF will appear here once the merchant has issued it.
              </p>
            )}

            <dl className="rounded-2xl border border-gray-100 px-4">
              {[
                ['Status', details.status],
                ['Loan amount', details.loanAmount],
                ['Interest', details.interest],
                ['Total to repay', details.totalToRepay],
                ['Automation', details.automation],
                ['Loan ID', details.loanId],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-0"
                >
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="max-w-[58%] text-right text-xs font-semibold text-[var(--sf-ink,#1E293B)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void declineOffer()}
                className={cn(
                  'h-12 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50',
                )}
              >
                Decline
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void acceptOffer()}
                className="h-12 rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
              >
                {busy ? 'Saving…' : 'Accept offer'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
