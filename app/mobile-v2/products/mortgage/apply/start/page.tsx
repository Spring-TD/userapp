'use client'

import React, { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ensureMortgageAccount } from '@/lib/mortgageApplyClient'
import {
  isDummyMortgageProductId,
  mortgageAccountSuccessHref,
} from '@/lib/mortgageApplyRoutes'

function MortgageApplyStartInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')?.trim() || ''
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [privacyAccepted, setPrivacyAccepted] = useState(true)
  const [processing, setProcessing] = useState(false)

  const handleAccept = async () => {
    if (!productId) {
      setError('No mortgage product selected.')
      return
    }

    setProcessing(true)
    setError(null)
    try {
      if (isDummyMortgageProductId(productId)) {
        await new Promise((r) => setTimeout(r, 900))
        router.replace(mortgageAccountSuccessHref(productId))
        return
      }

      const result = await ensureMortgageAccount(productId)
      if (!result.ok) {
        setError(result.error || 'Could not set up your mortgage account.')
        return
      }

      router.replace(mortgageAccountSuccessHref(productId))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-[#FAFAFA] overflow-hidden">
      <div className="px-6 pt-12">
        <Link
          href="/mobile-v2/products/mortgage"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center opacity-60">
        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Create a Mortgage Account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Accept the terms to create your account before continuing to the application.
        </p>
      </div>

      <div className="absolute inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-gray-300" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1E293B]">Create a Mortgage Account</h2>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
              Before you can proceed with <strong>Mortgage product</strong>, you are required to open
              a bank account with <strong>AG Mortgage Bank</strong>.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded bg-green-50 p-3 text-left text-xs text-green-900">
            <Image
              src="/images/mobile/cbn.png"
              alt="Central Bank of Nigeria"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
            />
            <span>
              <strong>AG Mortgage Bank</strong> is a licensed financial institution by the Central
              Bank of Nigeria.
            </span>
          </div>

          <div className="mt-5 space-y-3 text-left text-xs text-gray-700">
            <button
              type="button"
              onClick={() => setTermsAccepted((v) => !v)}
              className="flex items-center gap-2"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                {termsAccepted ? <Check className="h-3 w-3" /> : null}
              </span>
              Accept Terms & Condition, Data Sharing with Provider
            </button>
            <button
              type="button"
              onClick={() => setPrivacyAccepted((v) => !v)}
              className="flex items-center gap-2"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-white">
                {privacyAccepted ? <Check className="h-3 w-3" /> : null}
              </span>
              Accept Data Privacy & Use of Data
            </button>
          </div>

          {error ? <p className="mt-4 text-center text-xs text-red-600">{error}</p> : null}

          <Button
            type="button"
            disabled={!termsAccepted || !privacyAccepted || processing}
            className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] font-semibold text-white disabled:opacity-50"
            onClick={handleAccept}
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : (
              'Go ahead, Create Bank account'
            )}
          </Button>
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-gray-700"
            onClick={() => router.push('/mobile-v2/products/mortgage')}
          >
            No. Go back
          </button>
        </div>
      </div>
    </div>
  )
}

function MortgageApplyStartFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[#FAFAFA]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
    </div>
  )
}

export default function MortgageApplyStartPage() {
  return (
    <Suspense fallback={<MortgageApplyStartFallback />}>
      <MortgageApplyStartInner />
    </Suspense>
  )
}
