'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Download, Landmark, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CopyableDetailRow } from '@/components/mobile-v2/CopyableDetailRow'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import { patchMortgageWorkflowAsync, readMortgageWorkflow, type MortgageWorkflowModal } from '@/lib/mortgageWorkflow'
import { extractOfferLetterFromRecord } from '@/lib/offerLetter'
import type { InsufficientCentralWalletBalance } from '@/lib/pendingApprovedLoanApi'
import {
  extractAvailableInspectionDates,
  isMortgageDownPaymentPaidOrLater,
  mortgageDownPaymentDue,
  mortgageEquityBankDetails,
  mortgageFulfillmentStatus,
  type MortgageInspectionDateSlot,
  type PendingApprovedMortgageDetail,
} from '@/lib/postApprovalMortgage'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import { useUserWallet } from '@/hooks/useUserWallet'
import { formatNaira } from '@/lib/mobileProductDetailDisplay'
import { formatWalletBalance, isVirtualNubanActive } from '@/lib/userWallet'
import { cn } from '@/lib/utils'
import type { MobileProduct } from '@/lib/storefrontProducts'

/** Sheet modals only — virtual tour uses VirtualTourSheet instead. */
export type WorkflowModalKind = Exclude<MortgageWorkflowModal, 'virtual_tour'>

type MortgageWorkflowModalsProps = {
  active: WorkflowModalKind | null
  onClose: () => void
  applicationId: string
  productId: string
  product: MobileProduct | null
  propertyValue?: number | null
  downPaymentPercent?: number
  onStepAdvanced: () => void
}

function triggerDownload(filename: string, url?: string) {
  const href = url || '#'
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

function formatMerchantInspectionSlot(slot: MortgageInspectionDateSlot): string {
  const when = new Date(slot.scheduledFor)
  const whenLabel = Number.isNaN(when.getTime())
    ? slot.scheduledFor
    : when.toLocaleString('en-NG', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
  const parts = [slot.label || whenLabel]
  if (slot.label) parts.push(whenLabel)
  if (slot.location) parts.push(slot.location)
  return parts.join(' · ')
}

export function MortgageWorkflowModals({
  active,
  onClose,
  applicationId,
  productId,
  product,
  propertyValue,
  downPaymentPercent = 10,
  onStepAdvanced,
}: MortgageWorkflowModalsProps) {
  const { wallet, formattedBalance, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const userId = wallet?.userId
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadPurpose, setUploadPurpose] = useState<'contract' | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState(
    'Payment received — awaiting confirmation',
  )
  const [payMethod, setPayMethod] = useState<'wallet' | 'bank'>('wallet')
  const [detail, setDetail] = useState<PendingApprovedMortgageDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [insufficient, setInsufficient] = useState<InsufficientCentralWalletBalance | null>(null)
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | null>(null)
  const [offerPdfName, setOfferPdfName] = useState<string | null>(null)
  const [merchantSlots, setMerchantSlots] = useState<MortgageInspectionDateSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const computedFallbackAmount = useMemo(() => {
    if (!propertyValue || Number.isNaN(propertyValue)) return null
    return Math.round(propertyValue * (downPaymentPercent / 100))
  }, [downPaymentPercent, propertyValue])

  const downPaymentAmount = useMemo(() => {
    const fromApi = mortgageDownPaymentDue(detail)
    if (fromApi > 0) return fromApi
    return computedFallbackAmount
  }, [computedFallbackAmount, detail])

  const bankDetails = mortgageEquityBankDetails(detail)
  const fulfillmentStatus = mortgageFulfillmentStatus(detail)
  const alreadyPaid = isMortgageDownPaymentPaidOrLater(fulfillmentStatus)
  const nuban = wallet?.virtualNuban
  const nubanReady = isVirtualNubanActive(wallet)
  const accountHolder = String(wallet?.name || '').trim() || 'Your central wallet'

  const productOfferDocUrl = product?.documentsToDownload?.[0]?.fileUrl
  const contractDocUrl = product?.documentsToDownload?.[1]?.fileUrl || productOfferDocUrl
  const allocationDocUrl = product?.documentsToDownload?.[2]?.fileUrl || contractDocUrl
  const offerDocUrl = offerPdfUrl || productOfferDocUrl

  useEffect(() => {
    if (!userId || !applicationId) return
    if (
      active !== 'offer_letter' &&
      active !== 'accept_offer' &&
      active !== 'book_inspection' &&
      active !== 'down_payment'
    ) {
      return
    }

    let cancelled = false
    if (active === 'book_inspection') {
      setSlotsLoading(true)
      setSlotsError(null)
    }
    if (active === 'down_payment') {
      setDetailLoading(true)
      setInsufficient(null)
      setPaymentSuccess(false)
      setPayMethod('wallet')
    }

    void pendingApprovedMortgageApi.getDetail(applicationId, userId).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        if (active === 'book_inspection') {
          setSlotsError(res.error || 'Could not load inspection dates.')
          setSlotsLoading(false)
        }
        if (active === 'down_payment') {
          setDetailLoading(false)
          toast.error(res.error || 'Could not load down payment details.')
        }
        return
      }
      setDetail(res.data)
      const letter = extractOfferLetterFromRecord(res.data as unknown as Record<string, unknown>)
      if (letter?.pdfUrl) {
        setOfferPdfUrl(letter.pdfUrl)
        setOfferPdfName(letter.pdfFileName || null)
      }
      if (active === 'book_inspection') {
        const slots = extractAvailableInspectionDates(res.data)
        setMerchantSlots(slots)
        setSlotsError(
          slots.length === 0
            ? 'No booking dates set yet. The merchant needs to configure inspection slots on this product.'
            : null,
        )
        setSlotsLoading(false)
      }
      if (active === 'down_payment') {
        setDetailLoading(false)
        if (isMortgageDownPaymentPaidOrLater(mortgageFulfillmentStatus(res.data))) {
          setPaymentSuccess(true)
          setPaymentSuccessMessage(
            mortgageFulfillmentStatus(res.data) === 'contract_issued' ||
              mortgageFulfillmentStatus(res.data) === 'contract_signed' ||
              mortgageFulfillmentStatus(res.data) === 'disbursed'
              ? 'Contract ready'
              : 'Payment received — awaiting confirmation',
          )
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [active, applicationId, userId])

  useEffect(() => {
    setSelectedSlot(null)
  }, [active])

  const patch = async (data: Parameters<typeof patchMortgageWorkflowAsync>[1]) => {
    const result = await patchMortgageWorkflowAsync(applicationId, data)
    if (!result) {
      toast.error('Could not save workflow progress.')
      return false
    }
    if (!result.synced) {
      toast.error(result.syncError || 'Workflow sync failed', {
        description: 'Server did not accept the workflow update.',
      })
      return false
    }
    onStepAdvanced()
    return true
  }

  const handleDownloadOffer = async () => {
    let url = offerDocUrl
    let name = offerPdfName || 'mortgage-offer-letter.pdf'

    // Letter may land shortly after virtual-tour auto-send — refresh before failing.
    if (!url && userId) {
      setBusy(true)
      try {
        const res = await pendingApprovedMortgageApi.getDetail(applicationId, userId)
        if (res.ok) {
          setDetail(res.data)
          const letter = extractOfferLetterFromRecord(res.data as unknown as Record<string, unknown>)
          if (letter?.pdfUrl) {
            setOfferPdfUrl(letter.pdfUrl)
            setOfferPdfName(letter.pdfFileName || null)
            url = letter.pdfUrl
            name = letter.pdfFileName || name
          }
        }
      } finally {
        setBusy(false)
      }
    }

    if (!url) {
      toast.error('Offer letter PDF is not on this application yet', {
        description:
          'GET …/pending-approved-mortgage has no offerLetter.pdfUrl (or contract.documentUrl). On Plata, open View current offer letter — if that works, storefront GET is missing the URL.',
      })
      return
    }

    triggerDownload(name, url)
    const ok = await patch({ offerLetterDownloaded: true })
    if (!ok) return
    toast.success('Offer letter downloaded')
    onClose()
  }

  const localWorkflow = readMortgageWorkflow(applicationId)
  const inspectionAlreadyBooked = Boolean(localWorkflow?.inspectionScheduled)

  const handleBookInspection = async () => {
    if (!selectedSlot) {
      toast.error('Select a time slot to continue.')
      return
    }
    if (!userId) {
      toast.error('Sign in to book an inspection.')
      return
    }
    setBusy(true)
    try {
      const slot = merchantSlots.find((item) => item.scheduledFor === selectedSlot)
      if (!slot?.scheduledFor) {
        toast.error('Select a merchant-configured inspection slot.')
        return
      }
      const res = await pendingApprovedMortgageApi.scheduleInspection(
        applicationId,
        userId,
        slot.scheduledFor,
        { location: slot.location, notes: slot.notes },
      )
      if (!res.ok) {
        toast.error(res.error || 'Could not book inspection. Please try again.')
        return
      }
      const startRes = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
      if (!startRes.ok) {
        toast.error(startRes.error || 'Inspection booked, but start failed', {
          description: 'POST …/inspection/start',
        })
        return
      }
      const ok = await patch({ inspectionScheduled: true })
      if (!ok) return
      toast.success('Inspection booked')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleCompleteInspection = async (outcome: 'completed' | 'declined') => {
    if (!userId) {
      toast.error('Sign in to update inspection.')
      return
    }
    setBusy(true)
    try {
      const startRes = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
      if (!startRes.ok) {
        toast.error(startRes.error || 'Could not start inspection', {
          description: 'POST …/inspection/start',
        })
        return
      }
      const apiOutcome = outcome === 'declined' ? 'declined_offer' : 'completed'
      const res = await pendingApprovedMortgageApi.completeInspection(applicationId, userId, apiOutcome)
      if (!res.ok) {
        toast.error(res.error || 'Could not update inspection. Please try again.')
        return
      }
      if (outcome === 'declined') {
        const ok = await patch({
          inspectionCompleted: true,
          offerDeclined: true,
          offerAccepted: false,
        })
        if (!ok) return
        toast.message('Inspection declined')
      } else {
        const ok = await patch({ inspectionCompleted: true })
        if (!ok) return
        toast.success('Inspection confirmed')
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const acceptOffer = async () => {
    if (!userId) {
      toast.error('Sign in to accept this offer.')
      return
    }
    setBusy(true)
    try {
      const apiRes = await pendingApprovedMortgageApi.respondToOffer(applicationId, userId, true)
      if (!apiRes.ok) {
        toast.error(apiRes.error || 'Could not accept offer. Please try again.')
        return
      }
      const ok = await patch({
        offerAccepted: true,
        offerDeclined: false,
      })
      if (!ok) return
      toast.success('Mortgage offer accepted')
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
      const apiRes = await pendingApprovedMortgageApi.respondToOffer(applicationId, userId, false)
      if (!apiRes.ok) {
        toast.error(apiRes.error || 'Could not decline offer. Please try again.')
        return
      }
      const ok = await patch({
        offerAccepted: false,
        offerDeclined: true,
      })
      if (!ok) return
      toast.message('Mortgage offer declined')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handleUpload = async (file: File | null) => {
    if (!file) return
    if (!userId) {
      toast.error('Sign in to upload your signed contract.')
      return
    }
    setBusy(true)
    try {
      const res = await pendingApprovedMortgageApi.signContract(applicationId, userId)
      if (!res.ok) {
        toast.error(res.error || 'Could not sign contract. Please try again.')
        return
      }
      const ok = await patch({ contractAccepted: true })
      if (!ok) return
      toast.success('Signed contract uploaded')
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const handlePayDownPayment = async () => {
    if (!userId) {
      toast.error('Sign in to make payment.')
      return
    }
    if (alreadyPaid) {
      setPaymentSuccess(true)
      setPaymentSuccessMessage('Payment received — awaiting confirmation')
      return
    }
    setBusy(true)
    try {
      const amount = downPaymentAmount ?? undefined
      const res = await pendingApprovedMortgageApi.payDownPayment(applicationId, userId, amount ?? undefined)
      if (!res.ok) {
        if (res.insufficient) {
          setInsufficient(res.insufficient)
          return
        }
        toast.error(res.error || 'Could not submit down payment. Please try again.')
        return
      }
      setDetail(res.data)
      void refetchWallet()
      setPaymentSuccess(true)
      setPaymentSuccessMessage('Payment received — awaiting confirmation')
      toast.success('Payment received — awaiting confirmation')
      onStepAdvanced()
    } finally {
      setBusy(false)
    }
  }

  const handleRefreshBankPayment = async () => {
    if (!userId) {
      toast.error('Sign in to check payment status.')
      return
    }
    setBusy(true)
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
        setPaymentSuccess(true)
        setPaymentSuccessMessage('Payment received — awaiting confirmation')
        toast.success('Payment received — awaiting confirmation')
        onStepAdvanced()
      } else {
        toast.message('Payment not detected yet. Keep the merchant reference in your transfer narration.')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleRetryAfterFunding = async () => {
    void refetchWallet()
    setInsufficient(null)
    await handlePayDownPayment()
  }

  const handleDownloadContract = () => {
    triggerDownload('mortgage-contract.pdf', contractDocUrl)
    toast.message('Contract downloaded')
  }

  const handleDownloadAllocation = async () => {
    triggerDownload('mortgage-allocation.pdf', allocationDocUrl)
    const ok = await patch({ allocationDownloaded: true })
    if (!ok) return
    toast.success('Allocation document downloaded')
    onClose()
  }

  const openFilePicker = () => {
    setUploadPurpose('contract')
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null
          if (uploadPurpose === 'contract' && file) {
            void handleUpload(file)
          }
          event.target.value = ''
          setUploadPurpose(null)
        }}
      />

      <MortgageSheet open={active === 'offer_letter'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Offer Letter</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Download your mortgage offer letter and review the terms. Next you will accept or decline the offer.
          </p>
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5 text-center">
            <Download className="mx-auto h-8 w-8 text-[var(--sf-button,#1E40AF)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Mortgage Offer Letter</p>
            <p className="mt-1 text-xs text-gray-500">PDF document</p>
          </div>
          <Button
            className={cn('mt-8 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => void handleDownloadOffer()}
          >
            Download offer letter
          </Button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'book_inspection'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          {inspectionAlreadyBooked ? (
            <>
              <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Confirm Inspection</h2>
              <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
                Your inspection is booked. Confirm the visit outcome to continue to down payment.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleCompleteInspection('declined')}
                  className="h-12 rounded-full border-gray-200 text-sm font-semibold text-red-600"
                >
                  Declined
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCompleteInspection('completed')}
                  className={cn('h-12 rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    'Completed'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Book Inspection</h2>
              <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
                Choose one of the merchant&apos;s available inspection slots.
              </p>
              {slotsLoading ? (
                <div className="mt-8 flex justify-center text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading dates…
                </div>
              ) : slotsError ? (
                <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs text-amber-800">
                  {slotsError}
                </p>
              ) : (
                <div className="mt-5 max-h-64 space-y-2 overflow-y-auto no-scrollbar">
                  {merchantSlots.map((slot) => (
                    <label
                      key={slot.scheduledFor}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3',
                        selectedSlot === slot.scheduledFor
                          ? 'border-[var(--sf-button,#1E40AF)] sf-accent-soft'
                          : 'border-gray-100 bg-white',
                      )}
                    >
                      <input
                        type="radio"
                        name="inspectionSlot"
                        checked={selectedSlot === slot.scheduledFor}
                        onChange={() => setSelectedSlot(slot.scheduledFor)}
                        className="h-4 w-4 accent-[var(--sf-button,#1E40AF)]"
                      />
                      <span className="text-left text-sm font-medium text-[var(--sf-ink,#1E293B)]">
                        {formatMerchantInspectionSlot(slot)}
                        {slot.notes ? (
                          <span className="mt-1 block text-xs font-normal text-gray-500">{slot.notes}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <Button
                className={cn('mt-6 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                disabled={!selectedSlot || busy || slotsLoading || merchantSlots.length === 0}
                onClick={() => void handleBookInspection()}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking…
                  </span>
                ) : (
                  'Confirm booking'
                )}
              </Button>
            </>
          )}
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'accept_offer'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Accept Offer</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Review the offer letter, then accept or decline to continue. This step stays open until you choose.
          </p>
          {offerDocUrl ? (
            <Button
              type="button"
              variant="outline"
              className="mt-6 h-11 w-full rounded-full border-gray-200 text-sm font-semibold"
              onClick={() => triggerDownload(offerPdfName || 'mortgage-offer-letter.pdf', offerDocUrl)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download offer letter
            </Button>
          ) : (
            <p className="mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
              Offer letter PDF will appear here once the merchant has issued it.
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void declineOffer()}
              className="h-12 rounded-full border-gray-200 text-sm font-semibold text-red-600"
            >
              Decline
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void acceptOffer()}
              className={cn('h-12 rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </span>
              ) : (
                'Accept offer'
              )}
            </Button>
          </div>
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'down_payment'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          {paymentSuccess ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">{paymentSuccessMessage}</h2>
              <p className="mt-2 text-sm text-gray-500">
                Your equity payment is recorded. The merchant still needs to confirm receipt before the
                contract is issued.
              </p>
              <Button
                className={cn('mt-8 h-12 w-full rounded-full', MORTGAGE_PRIMARY)}
                onClick={() => {
                  setPaymentSuccess(false)
                  onClose()
                }}
              >
                Continue
              </Button>
            </div>
          ) : insufficient ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fund wallet</p>
                  <h2 className="mt-1 text-lg font-bold text-[var(--sf-ink,#1E293B)]">
                    Top up your central wallet
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Transfer at least the shortfall to your NGN account, wait for it to reflect, then retry
                    the down payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInsufficient(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                  aria-label="Back"
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

              <Button
                type="button"
                disabled={busy}
                onClick={() => void handleRetryAfterFunding()}
                className={cn('h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Retrying…
                  </span>
                ) : (
                  'I\'ve funded — retry payment'
                )}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Down Payment</h2>
              <p className="mx-auto mt-2 max-w-xs text-center text-xs text-gray-500">
                Offer already accepted. Pay the required equity to continue.
              </p>

              {detailLoading ? (
                <div className="mt-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--sf-button,#1E40AF)]" />
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Wallet balance</span>
                      <span className="font-bold text-[var(--sf-ink,#1E293B)]">
                        {walletLoading ? '…' : formattedBalance}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Amount due</span>
                      <span className="font-bold text-[var(--sf-button,#1E40AF)]">
                        {downPaymentAmount != null ? formatNaira(downPaymentAmount) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setPayMethod('wallet')}
                      className={cn(
                        'rounded-xl py-2.5 text-xs font-semibold',
                        payMethod === 'wallet'
                          ? 'bg-[var(--sf-button,#1E40AF)] text-white'
                          : 'text-gray-600',
                      )}
                    >
                      Central Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayMethod('bank')}
                      className={cn(
                        'rounded-xl py-2.5 text-xs font-semibold',
                        payMethod === 'bank'
                          ? 'bg-[var(--sf-button,#1E40AF)] text-white'
                          : 'text-gray-600',
                      )}
                    >
                      Bank transfer
                    </button>
                  </div>

                  {payMethod === 'wallet' ? (
                    <Button
                      className={cn('mt-6 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                      disabled={busy || downPaymentAmount == null}
                      onClick={() => void handlePayDownPayment()}
                    >
                      {busy ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        'Pay from wallet'
                      )}
                    </Button>
                  ) : (
                    <div className="mt-6 space-y-4">
                      <div className="space-y-3 rounded-2xl border border-gray-100 px-4 py-4">
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
                          <p className="text-sm text-amber-800">
                            Repayment account is not provisioned yet. You can still transfer using the
                            reference below once the account appears, or pay from your Central Wallet.
                          </p>
                        )}
                        <CopyableDetailRow
                          label="Narration / reference"
                          value={bankDetails?.merchantReference}
                        />
                        <CopyableDetailRow
                          label="Amount"
                          value={downPaymentAmount != null ? formatNaira(downPaymentAmount) : undefined}
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-500">
                        Use the merchant reference exactly as narration. After transferring, tap refresh —
                        payment is confirmed by webhook, not by this button.
                      </p>
                      <Button
                        className={cn('h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                        disabled={busy}
                        onClick={() => void handleRefreshBankPayment()}
                      >
                        {busy ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking…
                          </span>
                        ) : (
                          'I\'ve paid — refresh status'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'contract_signing'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Contract Signing</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Download the contract, sign it, then upload the signed copy.
          </p>
          <Button
            variant="outline"
            className="mt-6 h-12 w-full rounded-full border-gray-200 text-sm font-semibold"
            onClick={handleDownloadContract}
          >
            <Download className="mr-2 h-4 w-4" />
            Download contract
          </Button>
          <button
            type="button"
            onClick={() => openFilePicker()}
            disabled={busy}
            className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8"
          >
            <Upload className="h-7 w-7 text-[var(--sf-button,#1E40AF)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Upload signed contract</p>
          </button>
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'mortgage_allocation'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Mortgage Allocation</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Your mortgage has been allocated. Download your final allocation document.
          </p>
          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5 text-center">
            <Download className="mx-auto h-8 w-8 text-[var(--sf-button,#1E40AF)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Allocation Certificate</p>
          </div>
          <Button
            className={cn('mt-8 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
            onClick={() => void handleDownloadAllocation()}
          >
            Download allocation
          </Button>
        </div>
      </MortgageSheet>
    </>
  )
}
