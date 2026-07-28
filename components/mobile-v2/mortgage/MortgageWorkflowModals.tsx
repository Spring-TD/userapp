'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import { patchMortgageWorkflowAsync, readMortgageWorkflow, type MortgageWorkflowModal } from '@/lib/mortgageWorkflow'
import { extractOfferLetterFromRecord } from '@/lib/offerLetter'
import {
  extractAvailableInspectionDates,
  type MortgageInspectionDateSlot,
} from '@/lib/postApprovalMortgage'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import { useUserWallet } from '@/hooks/useUserWallet'
import { formatNaira } from '@/lib/mobileProductDetailDisplay'
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
  const { wallet, formattedBalance, loading: walletLoading } = useUserWallet()
  const userId = wallet?.userId
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadPurpose, setUploadPurpose] = useState<'contract' | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | null>(null)
  const [offerPdfName, setOfferPdfName] = useState<string | null>(null)
  const [merchantSlots, setMerchantSlots] = useState<MortgageInspectionDateSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const downPaymentAmount = useMemo(() => {
    if (!propertyValue || Number.isNaN(propertyValue)) return null
    return Math.round(propertyValue * (downPaymentPercent / 100))
  }, [downPaymentPercent, propertyValue])

  const productOfferDocUrl = product?.documentsToDownload?.[0]?.fileUrl
  const contractDocUrl = product?.documentsToDownload?.[1]?.fileUrl || productOfferDocUrl
  const allocationDocUrl = product?.documentsToDownload?.[2]?.fileUrl || contractDocUrl
  const offerDocUrl = offerPdfUrl || productOfferDocUrl

  useEffect(() => {
    if (!userId || !applicationId) return
    if (active !== 'offer_letter' && active !== 'accept_offer' && active !== 'book_inspection') return

    let cancelled = false
    if (active === 'book_inspection') {
      setSlotsLoading(true)
      setSlotsError(null)
    }

    void pendingApprovedMortgageApi.getDetail(applicationId, userId).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        if (active === 'book_inspection') {
          setSlotsError(res.error || 'Could not load inspection dates.')
          setSlotsLoading(false)
        }
        return
      }
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
    })

    return () => {
      cancelled = true
    }
  }, [active, applicationId, userId])

  useEffect(() => {
    setSelectedSlot(null)
  }, [active])

  const patch = async (data: Parameters<typeof patchMortgageWorkflowAsync>[1]) => {
    await patchMortgageWorkflowAsync(applicationId, data)
    onStepAdvanced()
  }

  const handleDownloadOffer = async () => {
    if (!offerDocUrl) {
      toast.error('Offer letter is not available yet. Please try again shortly.')
      return
    }
    triggerDownload(offerPdfName || 'mortgage-offer-letter.pdf', offerDocUrl)
    await patch({ offerLetterDownloaded: true })
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
      // Docs: appointment_scheduled → start inspection before complete / down payment.
      const startRes = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
      if (!startRes.ok) {
        // Booking succeeded; start can be retried when confirming the visit.
        console.warn('[mortgage] inspection/start failed:', startRes.error)
      }
      await patch({ inspectionScheduled: true })
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
      // Ensure inspection is started when confirming a prior booking.
      const startRes = await pendingApprovedMortgageApi.startInspection(applicationId, userId)
      if (!startRes.ok) {
        console.warn('[mortgage] inspection/start failed:', startRes.error)
      }
      const res = await pendingApprovedMortgageApi.completeInspection(applicationId, userId, outcome)
      if (!res.ok) {
        toast.error(res.error || 'Could not update inspection. Please try again.')
        return
      }
      if (outcome === 'declined') {
        await patch({
          inspectionCompleted: true,
          offerDeclined: true,
          offerAccepted: false,
        })
        toast.message('Inspection declined')
      } else {
        await patch({ inspectionCompleted: true })
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
      await patch({
        offerAccepted: true,
        offerDeclined: false,
      })
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
      await patch({
        offerAccepted: false,
        offerDeclined: true,
      })
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
      await patch({ contractAccepted: true })
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
    setBusy(true)
    try {
      const res = await pendingApprovedMortgageApi.payDownPayment(applicationId, userId, 'wallet')
      if (!res.ok) {
        const balance = wallet?.balance ?? 0
        const canPay = downPaymentAmount != null && balance >= downPaymentAmount
        toast.error(
          !canPay
            ? 'Insufficient wallet balance.'
            : res.error || 'Could not submit down payment. Please try again.',
        )
        return
      }
      await patch({ downPaymentConfirmed: true })
      setPaymentSuccess(true)
      toast.success('Down payment submitted')
    } finally {
      setBusy(false)
    }
  }

  const handleDownloadContract = () => {
    triggerDownload('mortgage-contract.pdf', contractDocUrl)
    toast.message('Contract downloaded')
  }

  const handleDownloadAllocation = async () => {
    triggerDownload('mortgage-allocation.pdf', allocationDocUrl)
    await patch({ allocationDownloaded: true })
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
              <h2 className="text-lg font-bold text-[var(--sf-ink,#1E293B)]">Payment successful</h2>
              <p className="mt-2 text-sm text-gray-500">Your down payment has been submitted.</p>
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
          ) : (
            <>
              <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Down Payment</h2>
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
                <p className="text-[11px] text-gray-500">
                  Down payment is auto-computed at {downPaymentPercent}% of the property value.
                </p>
              </div>
              <Button
                className={cn('mt-8 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
                disabled={busy || downPaymentAmount == null}
                onClick={() => void handlePayDownPayment()}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </span>
                ) : (
                  'Make payment'
                )}
              </Button>
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
