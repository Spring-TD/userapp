'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { patchLoanWorkflow, type LoanWorkflowModal } from '@/lib/loanWorkflow'
import { buildLoanApplicationDetails } from '@/lib/loanApplicationDetails'
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

export function LoanWorkflowModals({
  active,
  onClose,
  application,
  applicationId,
  product,
  providerName,
  onStepAdvanced,
}: LoanWorkflowModalsProps) {
  const [busy, setBusy] = useState(false)
  const details = buildLoanApplicationDetails(application, { product, providerName })
  const amount =
    typeof application.amount === 'number'
      ? formatWalletBalance(application.amount, application.currency || 'NGN')
      : details.loanAmount

  if (!active) return null

  const acknowledgeApproval = () => {
    patchLoanWorkflow(applicationId, { approvalAcknowledged: true })
    onStepAdvanced()
    toast.success('Approval reviewed')
    onClose()
  }

  const acceptOffer = async () => {
    setBusy(true)
    patchLoanWorkflow(applicationId, {
      approvalAcknowledged: true,
      offerAccepted: true,
      offerDeclined: false,
    })
    onStepAdvanced()
    setBusy(false)
    toast.success('Loan offer accepted')
    onClose()
  }

  const declineOffer = async () => {
    setBusy(true)
    patchLoanWorkflow(applicationId, {
      offerAccepted: false,
      offerDeclined: true,
    })
    onStepAdvanced()
    setBusy(false)
    toast.message('Loan offer declined')
    onClose()
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
                Confirm this loan offer to proceed to disbursement.
              </p>
            </div>

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
