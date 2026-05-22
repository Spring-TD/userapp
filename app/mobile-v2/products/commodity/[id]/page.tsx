'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Calendar, Check, ChevronDown, ChevronLeft, Minus, Percent, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileProducts } from '@/hooks/useMobileProducts'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import {
  asCommodityCatalogProduct,
  getDummyCommodityById,
  type CommodityCatalogProduct,
} from '@/lib/commodityCatalogDummy'

function formatNgn(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return 'NGN—'
  return `NGN${amount.toLocaleString('en-NG')}`
}

function formatNaira(amount?: number | null) {
  if (amount == null || Number.isNaN(amount)) return 'N0.00'
  return `N${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-gray-700">{value}</span>
    </div>
  )
}

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full rounded-t-[26px] bg-white px-8 pb-10 pt-3 shadow-2xl">
        <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-gray-300" />
        {children}
      </div>
    </div>
  )
}

function PinKey({ value, onClick }: { value: number | 'del' | ''; onClick: () => void }) {
  if (value === '') return <div />
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-md bg-white text-center shadow-sm active:bg-gray-50"
    >
      {value === 'del' ? (
        <span className="text-xl text-gray-500">⌫</span>
      ) : (
        <span className="block text-xl leading-none text-[#111827]">{value}</span>
      )}
    </button>
  )
}

export default function CommodityDetailPage() {
  const params = useParams()
  const productId = typeof params?.id === 'string' ? decodeURIComponent(params.id) : ''
  const { appId, ready: tenantReady } = useMobileV2Tenant()
  const { loading, getProductById } = useMobileProducts({
    springAppId: appId ?? undefined,
    tenantReady,
  })

  const product = useMemo<CommodityCatalogProduct | undefined>(() => {
    if (!productId) return undefined
    const apiProduct = getProductById(productId)
    if (apiProduct) return asCommodityCatalogProduct(apiProduct)
    return getDummyCommodityById(productId)
  }, [getProductById, productId])

  const [quantity, setQuantity] = useState(1)
  const [sheet, setSheet] = useState<'details' | 'account' | null>(null)
  const [step, setStep] = useState<'details' | 'pin' | 'success'>('details')
  const [pin, setPin] = useState<string[]>(['3', '8', '9', '8'])

  const displayProduct = product ?? getDummyCommodityById('dummy-commodity-maize')!

  const pushPin = (digit: number) => {
    const firstEmpty = pin.findIndex((p) => !p)
    if (firstEmpty === -1) return
    const next = [...pin]
    next[firstEmpty] = String(digit)
    setPin(next)
  }

  const popPin = () => {
    const lastFilled = pin.findLastIndex((p) => Boolean(p))
    if (lastFilled === -1) return
    const next = [...pin]
    next[lastFilled] = ''
    setPin(next)
  }

  if (!tenantReady || loading) {
    return <div className="h-full bg-[#FAFAFA]" />
  }

  if (step === 'success') {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#FAFAFA] px-8 text-center">
        <div className="relative mb-8 h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-[#2DD4BF] opacity-20" />
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-[#2DD4BF] shadow-lg">
            <Check className="h-16 w-16 stroke-[4] text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#1E293B]">Payment Done Successfully</h1>
        <Link href="/mobile-v2/products/commodity" className="mt-10 w-full max-w-sm">
          <Button className="h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white">
            Done
          </Button>
        </Link>
      </div>
    )
  }

  if (step === 'pin') {
    return (
      <div className="flex h-full flex-col bg-[#FAFAFA]">
        <div className="px-6 pt-12">
          <button
            type="button"
            onClick={() => setStep('details')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center px-8 pt-28 text-center">
          <h1 className="mb-10 text-lg font-medium text-[#111827]">Enter your transaction pin</h1>
          <div className="mb-12 flex gap-3">
            {pin.map((digit, index) => (
              <div
                key={index}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--sf-button,#1E40AF)] bg-white text-lg text-[#111827]"
              >
                {digit}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setStep('success')}
            className="h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            Pay Now
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1 bg-gray-300 px-1 pb-16 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key, index) => (
            <PinKey
              key={`${key}-${index}`}
              value={key as number | 'del' | ''}
              onClick={() => {
                if (typeof key === 'number') pushPin(key)
                if (key === 'del') popPin()
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-[#FAFAFA]">
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-6 pt-12">
          <Link
            href="/mobile-v2/products/commodity"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </div>

        <div className="px-6 pt-8">
          <div
            className="relative h-[190px] overflow-hidden rounded-[18px] bg-gray-100 bg-cover bg-center"
            style={{ backgroundImage: `url(${displayProduct.image})` }}
          >
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-4 py-1.5 text-[10px] font-medium text-gray-700 shadow-sm">
              By AG Mortgage
            </span>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <h1 className="line-clamp-1 text-sm font-medium text-[#1E293B]">
              {displayProduct.name}.....
            </h1>
            <div className="shrink-0 text-right">
              <p className="text-[8px] text-gray-500">Current Price</p>
              <p className="text-sm font-bold text-[#1E293B]">{formatNgn(displayProduct.price)}</p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-gray-600">
            {displayProduct.description}
          </p>

          <div className="mt-4 flex gap-6 text-[11px] font-semibold text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {displayProduct.duration}
            </span>
            <span className="inline-flex items-center gap-2">
              <Percent className="h-3.5 w-3.5 text-gray-400" />
              {displayProduct.interestRate}
            </span>
          </div>

          <div className="mt-10 space-y-8">
            <InfoRow label="Min purchase" value={formatNaira(displayProduct.minPurchase)} />
            <InfoRow
              label="Buy more"
              value={
                <span className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  {quantity}
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </span>
              }
            />
            <InfoRow
              label="Start Date"
              value={
                <span className="inline-flex items-center gap-1">
                  {displayProduct.startDate}
                  <ChevronDown className="h-4 w-4" />
                </span>
              }
            />
            <InfoRow
              label="Investment Period"
              value={
                <span className="inline-flex items-center gap-1">
                  1 year
                  <ChevronDown className="h-4 w-4" />
                </span>
              }
            />
            <InfoRow label="Powered by:" value="AG Mortgage Bank" />
            <InfoRow label="Total" value={formatNaira(displayProduct.total)} />
          </div>

          <Button
            onClick={() => setSheet('details')}
            className="mt-8 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            Purchase
          </Button>
        </div>
      </div>

      {sheet === 'details' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <h2 className="mb-7 text-center text-base font-bold text-[var(--sf-button,#1E40AF)]">
            Details
          </h2>
          <div className="space-y-7">
            <InfoRow label="Min purchase" value={formatNaira(displayProduct.minPurchase)} />
            <InfoRow label="Unit" value={quantity + 1} />
            <InfoRow label="R.O.I" value={displayProduct.roi} />
            <InfoRow label="Start Date" value={displayProduct.startDate} />
            <InfoRow label="Maturity Date" value={displayProduct.maturityDate} />
            <InfoRow label="Ref No:" value={displayProduct.refNo} />
            <InfoRow label="Powered by:" value="AG Mortgage Bank" />
          </div>
          <Button
            onClick={() => setSheet('account')}
            className="mt-10 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            Start Saving
          </Button>
        </BottomSheet>
      )}

      {sheet === 'account' && (
        <BottomSheet onClose={() => setSheet(null)}>
          <h2 className="mb-7 text-center text-xl font-bold text-[#1E293B]">Account Details</h2>
          <div className="space-y-5 px-2 text-sm">
            <div>
              <p className="text-[10px] text-gray-400">Bank Name</p>
              <p className="font-bold text-[#111827]">AG Mortgage Bank</p>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-5">
              <div>
                <p className="text-[10px] text-gray-400">Account Number</p>
                <p className="font-bold text-[#111827]">7012345678</p>
              </div>
              <span className="h-4 w-4 rounded bg-gray-400" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-500">Commodity Wallet</p>
              <span className="h-4 w-4 rounded-full border-4 border-gray-300" />
            </div>
          </div>
          <Button
            onClick={() => {
              setSheet(null)
              setStep('pin')
            }}
            className="mt-10 h-14 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-base font-semibold text-white"
          >
            Continue
          </Button>
        </BottomSheet>
      )}
    </div>
  )
}
