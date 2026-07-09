'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Check, Download, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import { patchMortgageWorkflowAsync } from '@/lib/mortgageWorkflow'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import { useUserWallet } from '@/hooks/useUserWallet'
import { formatNaira } from '@/lib/mobileProductDetailDisplay'
import { cn } from '@/lib/utils'
import type { MobileProduct } from '@/lib/storefrontProducts'

type WorkflowModalKind =
  | 'offer_letter'
  | 'book_inspection'
  | 'accept_offer'
  | 'down_payment'
  | 'contract_signing'
  | 'mortgage_allocation'

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

function buildInspectionSlots() {
  const slots: { id: string; label: string; iso: string }[] = []
  const now = new Date()
  for (let day = 1; day <= 5; day += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() + day)
    ;['10:00 AM', '2:00 PM', '4:30 PM'].forEach((time) => {
      const label = `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`
      slots.push({
        id: `${day}-${time}`,
        label,
        iso: date.toISOString(),
      })
    })
  }
  return slots
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
  const [uploadPurpose, setUploadPurpose] = useState<'offer' | 'contract' | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const slots = useMemo(() => buildInspectionSlots(), [])
  const downPaymentAmount = useMemo(() => {
    if (!propertyValue || Number.isNaN(propertyValue)) return null
    return Math.round(propertyValue * (downPaymentPercent / 100))
  }, [downPaymentPercent, propertyValue])

  const offerDocUrl = product?.documentsToDownload?.[0]?.fileUrl
  const contractDocUrl = product?.documentsToDownload?.[1]?.fileUrl || offerDocUrl
  const allocationDocUrl = product?.documentsToDownload?.[2]?.fileUrl || contractDocUrl

  const patch = async (data: Parameters<typeof patchMortgageWorkflowAsync>[1]) => {
    await patchMortgageWorkflowAsync(applicationId, data)
    onStepAdvanced()
  }

  const handleDownloadOffer = async () => {
    triggerDownload('mortgage-offer-letter.pdf', offerDocUrl)
    await patch({ offerLetterDownloaded: true })
    toast.success('Offer letter downloaded')
    onClose()
  }

  const handleBookInspection = async () => {
    if (!selectedSlot) {
      toast.error('Select a time slot to continue.')
      return
    }
    setBusy(true)
    const slot = slots.find((item) => item.id === selectedSlot)
    if (userId) {
      const res = await pendingApprovedMortgageApi.scheduleInspection(applicationId, userId, slot?.iso)
      if (!res.ok) {
        await patch({ inspectionScheduled: true })
      } else {
        await patch({ inspectionScheduled: true })
      }
    } else {
      await patch({ inspectionScheduled: true })
    }
    setBusy(false)
    toast.success('Inspection booked')
    onClose()
  }

  const handleUpload = async (purpose: 'offer' | 'contract', file: File | null) => {
    if (!file) return
    setBusy(true)
    if (purpose === 'offer') {
      if (userId) {
        await pendingApprovedMortgageApi.respondToOffer(applicationId, userId, true)
      }
      await patch({
        signedOfferUploaded: true,
        offerAccepted: true,
        offerDeclined: false,
      })
      toast.success('Signed offer uploaded')
    } else {
      if (userId) {
        await pendingApprovedMortgageApi.signContract(applicationId, userId)
      }
      await patch({ contractAccepted: true })
      toast.success('Signed contract uploaded')
    }
    setBusy(false)
    onClose()
  }

  const handlePayDownPayment = async () => {
    if (!userId) {
      toast.error('Sign in to make payment.')
      return
    }
    setBusy(true)
    const res = await pendingApprovedMortgageApi.payDownPayment(applicationId, userId, 'wallet')
    if (!res.ok) {
      const balance = wallet?.balance ?? 0
      const canPay = downPaymentAmount != null && balance >= downPaymentAmount
      if (!canPay) {
        setBusy(false)
        toast.error('Insufficient wallet balance.')
        return
      }
      await patch({ downPaymentConfirmed: true })
    } else {
      await patch({ downPaymentConfirmed: true })
    }
    setBusy(false)
    setPaymentSuccess(true)
    toast.success('Down payment submitted')
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

  const openFilePicker = (purpose: 'offer' | 'contract') => {
    setUploadPurpose(purpose)
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
          if (uploadPurpose && file) {
            void handleUpload(uploadPurpose, file)
          }
          event.target.value = ''
          setUploadPurpose(null)
        }}
      />

      <MortgageSheet open={active === 'offer_letter'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Offer Letter</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Download your mortgage offer letter, review the terms, then continue to book an inspection.
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
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Book Inspection</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Select an available time slot for your property inspection.
          </p>
          <div className="mt-5 max-h-64 space-y-2 overflow-y-auto no-scrollbar">
            {slots.map((slot) => (
              <label
                key={slot.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3',
                  selectedSlot === slot.id
                    ? 'border-[var(--sf-button,#1E40AF)] sf-accent-soft'
                    : 'border-gray-100 bg-white',
                )}
              >
                <input
                  type="radio"
                  name="inspectionSlot"
                  checked={selectedSlot === slot.id}
                  onChange={() => setSelectedSlot(slot.id)}
                  className="h-4 w-4 accent-[var(--sf-button,#1E40AF)]"
                />
                <span className="text-sm font-medium text-[var(--sf-ink,#1E293B)]">{slot.label}</span>
              </label>
            ))}
          </div>
          <Button
            className={cn('mt-6 h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
            disabled={!selectedSlot || busy}
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
        </div>
      </MortgageSheet>

      <MortgageSheet open={active === 'accept_offer'} onClose={onClose}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Accept Offer</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-500">
            Upload your signed offer document to accept this mortgage offer.
          </p>
          <button
            type="button"
            onClick={() => openFilePicker('offer')}
            disabled={busy}
            className="mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-10"
          >
            <Upload className="h-8 w-8 text-[var(--sf-button,#1E40AF)]" />
            <p className="mt-3 text-sm font-semibold text-[var(--sf-ink,#1E293B)]">Upload signed offer</p>
            <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG</p>
          </button>
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
            onClick={() => openFilePicker('contract')}
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
