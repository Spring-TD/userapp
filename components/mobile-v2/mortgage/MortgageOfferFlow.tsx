'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Check, ChevronLeft, Landmark, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CopyableDetailRow } from '@/components/mobile-v2/CopyableDetailRow'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import { mortgagePendingDetailHref } from '@/lib/mortgageApplyRoutes'
import { patchMortgageWorkflowAsync } from '@/lib/mortgageWorkflow'
import type { InsufficientCentralWalletBalance } from '@/lib/pendingApprovedLoanApi'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import {
  isMortgageDownPaymentPaidOrLater,
  mortgageDownPaymentDue,
  mortgageEquityBankDetails,
  mortgageFulfillmentStatus,
  type PendingApprovedMortgageDetail,
} from '@/lib/postApprovalMortgage'
import { useUserWallet } from '@/hooks/useUserWallet'
import { formatNaira, formatNgn } from '@/lib/mobileProductDetailDisplay'
import { formatWalletBalance, isVirtualNubanActive } from '@/lib/userWallet'
import { cn } from '@/lib/utils'

export type MortgageOfferFlowStep =
  | 'schedule_inspection'
  | 'inspection'
  | 'down_payment'
  | 'contract'

type MortgageOfferFlowProps = {
  productId: string
  applicationId?: string
  productName: string
  provider: string
  propertyValue?: number | null
  downPaymentPercent?: number | null
  backHref: string
  initialStep?: MortgageOfferFlowStep
}

type InspectionSheet = 'none' | 'progress' | 'status'
type PaymentSheet = 'none' | 'success' | 'pending'

const FLOW_STEPS: MortgageOfferFlowStep[] = [
  'schedule_inspection',
  'inspection',
  'down_payment',
  'contract',
]

function StepProgress({ current }: { current: MortgageOfferFlowStep }) {
  const currentIndex = FLOW_STEPS.indexOf(current)

  return (
    <div className="mb-8 flex items-center justify-center gap-0 px-2">
      {FLOW_STEPS.map((flowStep, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <React.Fragment key={flowStep}>
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                done || active
                  ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                  : 'border-gray-300 bg-white text-gray-400',
              )}
            >
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < FLOW_STEPS.length - 1 ? (
              <div
                className={cn(
                  'h-0.5 w-8 sm:w-12',
                  index < currentIndex ? 'bg-[var(--sf-button,#1E40AF)]' : 'bg-gray-200',
                )}
              />
            ) : null}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function MortgageOfferFlow({
  productId,
  applicationId,
  productName,
  provider: _provider,
  propertyValue,
  downPaymentPercent,
  backHref,
  initialStep = 'schedule_inspection',
}: MortgageOfferFlowProps) {
  const router = useRouter()
  const { wallet, formattedBalance, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const userId = wallet?.userId
  const [step, setStep] = useState<MortgageOfferFlowStep>(initialStep)
  const [inspectionSheet, setInspectionSheet] = useState<InspectionSheet>('none')
  const [inspectionChoice, setInspectionChoice] = useState<'completed' | 'declined' | null>(null)
  const [paymentSheet, setPaymentSheet] = useState<PaymentSheet>('none')
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'wallet' | 'bank'>('wallet')
  const [detail, setDetail] = useState<PendingApprovedMortgageDetail | null>(null)
  const [insufficient, setInsufficient] = useState<InsufficientCentralWalletBalance | null>(null)

  const percent = downPaymentPercent ?? 10
  const computedFallbackAmount = useMemo(() => {
    if (!propertyValue || Number.isNaN(propertyValue)) return null
    return Math.round(propertyValue * (percent / 100))
  }, [percent, propertyValue])

  const downPaymentAmount = useMemo(() => {
    const fromApi = mortgageDownPaymentDue(detail)
    if (fromApi > 0) return fromApi
    return computedFallbackAmount
  }, [computedFallbackAmount, detail])

  const displayAmount = downPaymentAmount != null ? formatNaira(downPaymentAmount) : formatNgn(propertyValue)
  const bankDetails = mortgageEquityBankDetails(detail)
  const alreadyPaid = isMortgageDownPaymentPaidOrLater(mortgageFulfillmentStatus(detail))
  const nuban = wallet?.virtualNuban
  const nubanReady = isVirtualNubanActive(wallet)
  const accountHolder = String(wallet?.name || '').trim() || 'Your central wallet'
  const pendingHref = applicationId ? mortgagePendingDetailHref(applicationId) : backHref

  useEffect(() => {
    if (!userId || !applicationId || step !== 'down_payment') return
    let cancelled = false
    void pendingApprovedMortgageApi.getDetail(applicationId, userId).then((res) => {
      if (cancelled || !res.ok) return
      setDetail(res.data)
      if (isMortgageDownPaymentPaidOrLater(mortgageFulfillmentStatus(res.data))) {
        setPaymentSheet('success')
      }
    })
    return () => {
      cancelled = true
    }
  }, [applicationId, step, userId])

  const patch = async (data: Parameters<typeof patchMortgageWorkflowAsync>[1]) => {
    if (!applicationId) return
    await patchMortgageWorkflowAsync(applicationId, data)
  }

  const finishToPending = () => {
    router.replace(pendingHref)
  }

  const handleScheduleConfirm = async () => {
    if (!userId || !applicationId) {
      toast.error('Sign in to book an inspection.')
      return
    }
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000)
    scheduledFor.setHours(10, 0, 0, 0)
    const res = await pendingApprovedMortgageApi.scheduleInspection(
      applicationId,
      userId,
      scheduledFor.toISOString(),
    )
    if (!res.ok) {
      toast.error(res.error || 'Could not book inspection. Please try again.')
      return
    }
    const startRes = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
    if (!startRes.ok) {
      console.warn('[mortgage] inspection/start failed:', startRes.error)
    }
    await patch({ inspectionScheduled: true })
    setStep('inspection')
    toast.success('Inspection appointment noted.')
  }

  const advanceFromInspection = async () => {
    if (!inspectionChoice) {
      toast.error('Choose an inspection outcome to continue.')
      return
    }
    if (!userId || !applicationId) {
      toast.error('Sign in to complete inspection.')
      return
    }
    const res = await pendingApprovedMortgageApi.completeInspection(
      applicationId,
      userId,
      inspectionChoice === 'completed' ? 'completed' : 'declined',
    )
    if (!res.ok) {
      toast.error(res.error || 'Could not update inspection. Please try again.')
      return
    }
    await patch({
      inspectionCompleted: true,
      ...(inspectionChoice === 'declined' ? { offerDeclined: true, offerAccepted: false } : {}),
    })
    if (inspectionChoice === 'declined') {
      toast.message('Inspection declined')
      finishToPending()
      return
    }
    setStep('down_payment')
  }

  const handleStartInspection = async () => {
    if (userId && applicationId) {
      const res = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
      if (!res.ok) {
        toast.error(res.error || 'Could not start inspection. Please try again.')
        return
      }
    }
    setInspectionSheet('status')
  }

  const handlePayNow = async () => {
    if (!userId || !applicationId) {
      toast.error('Sign in to pay down payment.')
      return
    }
    if (alreadyPaid) {
      setPaymentSheet('success')
      return
    }
    setPaying(true)
    try {
      const res = await pendingApprovedMortgageApi.payDownPayment(
        applicationId,
        userId,
        downPaymentAmount ?? undefined,
      )
      if (!res.ok) {
        if (res.insufficient) {
          setInsufficient(res.insufficient)
          setPaymentSheet('pending')
          return
        }
        setPaymentSheet('pending')
        toast.error(res.error || 'Could not submit down payment. Please try again.')
        return
      }
      setDetail(res.data)
      void refetchWallet()
      setPaymentSheet('success')
      toast.success('Payment received — awaiting confirmation')
    } finally {
      setPaying(false)
    }
  }

  const handleRefreshBankPayment = async () => {
    if (!userId || !applicationId) {
      toast.error('Sign in to check payment status.')
      return
    }
    setPaying(true)
    try {
      const res = await pendingApprovedMortgageApi.pollDownPaymentStatus(applicationId, userId, {
        attempts: 4,
        intervalMs: 2000,
      })
      if (!res.ok) {
        toast.error(res.error || 'Could not refresh payment status.')
        return
      }
      setDetail(res.data)
      if (isMortgageDownPaymentPaidOrLater(mortgageFulfillmentStatus(res.data))) {
        setPaymentSheet('success')
        toast.success('Payment received — awaiting confirmation')
      } else {
        toast.message('Payment not detected yet. Keep the merchant reference in your transfer narration.')
      }
    } finally {
      setPaying(false)
    }
  }

  const handleSignContract = async () => {
    if (!userId || !applicationId) {
      toast.error('Sign in to accept contract.')
      return
    }
    const res = await pendingApprovedMortgageApi.signContract(applicationId, userId)
    if (!res.ok) {
      toast.error(res.error || 'Could not sign contract. Please try again.')
      return
    }
    await patch({ contractAccepted: true })
    toast.success('Contract signed')
    finishToPending()
  }

  const stepNumber = FLOW_STEPS.indexOf(step) + 1

  return (
    <div className="flex min-h-full flex-col sf-page-bg">
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-10 no-scrollbar">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={pendingHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold text-[var(--sf-ink,#1E293B)]">Pending Mortgage</h1>
        </div>

        <StepProgress current={step} />

        <div className="rounded-[28px] border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-3xl font-bold text-[var(--sf-button,#1E40AF)]">
            {stepNumber}
          </div>

          {step === 'schedule_inspection' ? (
            <>
              <h2 className="text-xl font-bold text-[var(--sf-button,#1E40AF)]">Inspection Booking</h2>
              <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                Book an appointment to inspect <span className="font-medium text-gray-700">{productName}</span>.
                Appointment scheduling will be available here soon.
              </p>
              <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full sf-accent-soft text-[var(--sf-button,#1E40AF)]">
                <Calendar className="h-7 w-7" />
              </div>
              <Button
                className={cn('mt-8 h-12 w-full max-w-xs rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                onClick={handleScheduleConfirm}
              >
                I&apos;ve scheduled my appointment
              </Button>
            </>
          ) : null}

          {step === 'inspection' ? (
            <>
              <h2 className="text-xl font-bold text-[var(--sf-button,#1E40AF)]">Inspection Outcome</h2>
              <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                Kindly visit the property within two to three working days, then confirm whether the inspection is
                completed or you wish to decline the offer.
              </p>
              <Button
                className={cn('mt-8 h-12 w-full max-w-xs rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                onClick={() => void handleStartInspection()}
              >
                Start inspection
              </Button>
            </>
          ) : null}

          {step === 'down_payment' ? (
            <>
              <h2 className="text-xl font-bold text-[var(--sf-button,#1E40AF)]">Down Payment</h2>
              <div className="mt-6 space-y-4 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-[var(--sf-ink,#1E293B)]">{displayAmount}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setPayMethod('wallet')}
                    className={cn(
                      'rounded-xl py-2.5 text-xs font-semibold',
                      payMethod === 'wallet' ? 'bg-[var(--sf-button,#1E40AF)] text-white' : 'text-gray-600',
                    )}
                  >
                    Central Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('bank')}
                    className={cn(
                      'rounded-xl py-2.5 text-xs font-semibold',
                      payMethod === 'bank' ? 'bg-[var(--sf-button,#1E40AF)] text-white' : 'text-gray-600',
                    )}
                  >
                    Bank transfer
                  </button>
                </div>

                {payMethod === 'wallet' ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Central Wallet</p>
                    <p className="text-xs text-gray-500">
                      {walletLoading ? 'Loading balance…' : `Available: ${formattedBalance}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Merchant repayment account
                    </p>
                    {bankDetails?.accountNumber ? (
                      <>
                        <CopyableDetailRow
                          label="Account Name"
                          value={bankDetails.accountName || 'Merchant Repayment Wallet'}
                        />
                        <CopyableDetailRow label="Account Number" value={bankDetails.accountNumber} />
                        <CopyableDetailRow label="Bank Name" value={bankDetails.bankName} />
                      </>
                    ) : (
                      <p className="text-xs text-amber-800">
                        Repayment account not provisioned yet. Use the reference below once available, or
                        pay from wallet.
                      </p>
                    )}
                    <CopyableDetailRow label="Narration / reference" value={bankDetails?.merchantReference} />
                  </div>
                )}
              </div>
              <Button
                className={cn('mt-8 h-12 w-full max-w-xs rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                disabled={paying}
                onClick={() => void (payMethod === 'wallet' ? handlePayNow() : handleRefreshBankPayment())}
              >
                {paying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </span>
                ) : payMethod === 'wallet' ? (
                  'Pay Now'
                ) : (
                  "I've paid — refresh status"
                )}
              </Button>
            </>
          ) : null}

          {step === 'contract' ? (
            <>
              <h2 className="text-xl font-bold text-[var(--sf-button,#1E40AF)]">Contract Signed</h2>
              <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
                Your loan approval contract has been sent to your email. Review and accept to proceed to
                disbursement.
              </p>
              <Button
                className={cn('mt-8 h-12 w-full max-w-xs rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                onClick={() => void handleSignContract()}
              >
                Sign Contract
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <MortgageSheet open={inspectionSheet === 'progress'} onClose={() => setInspectionSheet('none')}>
        <div className="px-2 pb-2 pt-4 text-center">
          <h3 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">Inspection in progress</h3>
          <div className="mx-auto my-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--sf-tint,#E0E7FF)]">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--sf-button,#1E40AF)]" />
          </div>
          <p className="text-sm text-gray-500">Kindly visit the property within two to three working days</p>
          <Button className={cn('mt-8 h-12 w-full rounded-full', MORTGAGE_PRIMARY)} onClick={() => setInspectionSheet('status')}>
            Next
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={inspectionSheet === 'status'} onClose={() => setInspectionSheet('none')}>
        <div className="px-2 pb-2 pt-4">
          <h3 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Inspection Status</h3>
          <div className="mt-6 space-y-3">
            {(
              [
                { id: 'completed' as const, label: 'Inspection completed' },
                { id: 'declined' as const, label: 'Declined Offer' },
              ] as const
            ).map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4',
                  inspectionChoice === option.id ? 'border-[var(--sf-button,#1E40AF)] sf-accent-soft' : 'border-gray-100 bg-white',
                )}
              >
                <input
                  type="radio"
                  name="inspectionStatus"
                  checked={inspectionChoice === option.id}
                  onChange={() => setInspectionChoice(option.id)}
                  className="h-4 w-4 accent-[var(--sf-button,#1E40AF)]"
                />
                <span className="text-sm font-medium text-[var(--sf-ink,#1E293B)]">{option.label}</span>
              </label>
            ))}
          </div>
          <Button
            className={cn('mt-8 h-12 w-full rounded-full', MORTGAGE_PRIMARY)}
            disabled={!inspectionChoice}
            onClick={async () => {
              setInspectionSheet('none')
              await advanceFromInspection()
            }}
          >
            Continue
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={paymentSheet === 'success'} onClose={() => setPaymentSheet('none')}>
        <div className="px-2 pb-2 pt-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">
            Payment received — awaiting confirmation
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            The merchant still needs to confirm receipt before your contract is issued. This is not
            disbursement yet.
          </p>
          <Button
            className={cn('mt-8 h-12 w-full rounded-full', MORTGAGE_PRIMARY)}
            onClick={() => {
              setPaymentSheet('none')
              finishToPending()
            }}
          >
            Done
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet
        open={paymentSheet === 'pending'}
        onClose={() => {
          setPaymentSheet('none')
          setInsufficient(null)
        }}
      >
        <div className="px-2 pb-2 pt-4">
          {insufficient ? (
            <div className="space-y-5 text-left">
              <div className="text-center">
                <h3 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">Top up your central wallet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Transfer at least the shortfall, wait for it to reflect, then retry.
                </p>
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
              <div className="space-y-3 rounded-2xl border border-gray-100 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Landmark className="h-4 w-4 text-[var(--sf-button,#1E40AF)]" />
                  Fund via bank transfer
                </div>
                {nubanReady ? (
                  <>
                    <CopyableDetailRow label="Account Holder" value={accountHolder} />
                    <CopyableDetailRow label="Account Number" value={nuban?.accountNumber} />
                    <CopyableDetailRow label="Bank Name" value={nuban?.bankName} />
                  </>
                ) : (
                  <p className="text-sm text-gray-600">Your bank transfer account is not active yet.</p>
                )}
              </div>
              <Button
                className={cn('h-12 w-full rounded-full', MORTGAGE_PRIMARY)}
                disabled={paying}
                onClick={() => {
                  setInsufficient(null)
                  void refetchWallet()
                  void handlePayNow()
                }}
              >
                I&apos;ve funded — retry payment
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-600">
                !
              </div>
              <h3 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">Pending</h3>
              <p className="mt-2 text-sm text-gray-500">We couldn&apos;t complete the payment yet.</p>
              <Button
                className={cn('mt-6 h-12 w-full rounded-full', MORTGAGE_PRIMARY)}
                onClick={() => {
                  setPaymentSheet('none')
                  finishToPending()
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </MortgageSheet>
    </div>
  )
}
