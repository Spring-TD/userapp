'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { initializeProductApplication } from '@/lib/storefrontApplicationClient'
import { loanAccountSuccessHref, loanApplyHref } from '@/lib/loanApplyRoutes'
import {
  isDuplicateAccountError,
  resolveProductApplicationAccount,
} from '@/lib/resolveProductApplicationAccount'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import {
  formatApplicationAmountHint,
  parseApplicationAmount,
  validateApplicationAmount,
} from '@/lib/applicationAmount'

function LoanApplyStartInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { displayName, tenantSubdomain } = useMobileV2Tenant()
  const rawProductId = searchParams.get('productId') ?? ''
  const productId = sanitizeProductId(rawProductId)
  const providerName = displayName || tenantSubdomain || 'Provider'
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [applicationAmount, setApplicationAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [hasInitializedAccount, setHasInitializedAccount] = useState(false)
  const { product } = useMobileProductDetail({
    productId,
    enabled: Boolean(productId),
  })
  const parsedAmount = parseApplicationAmount(applicationAmount)
  const amountValidationError =
    parsedAmount != null
      ? validateApplicationAmount(parsedAmount, product?.amountMin, product?.amountMax)
      : applicationAmount.trim()
        ? 'Enter a valid loan amount.'
        : null

  useEffect(() => {
    if (!rawProductId || rawProductId === productId) return
    const params = new URLSearchParams(window.location.search)
    params.set('productId', productId)
    const embeddedSubdomain = rawProductId.match(/subdomain=([^&/?#]+)/i)?.[1]
    if (embeddedSubdomain && !params.get('subdomain')) {
      params.set('subdomain', embeddedSubdomain)
    }
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [rawProductId, productId, router])

  useEffect(() => {
    let cancelled = false

    async function checkExistingApplication() {
      if (!productId) {
        setCheckingExisting(false)
        return
      }

      setCheckingExisting(true)
      try {
        const userId = await resolveWalletUserId()
        if (!userId) return

        const resolved = await resolveProductApplicationAccount(userId, productId)
        if (!cancelled && resolved.hasAccount) {
          setHasInitializedAccount(true)
          router.replace(loanApplyHref(productId))
        }
      } catch (error) {
        console.warn('Could not check existing initialized loan application:', error)
      } finally {
        if (!cancelled) setCheckingExisting(false)
      }
    }

    void checkExistingApplication()

    return () => {
      cancelled = true
    }
  }, [productId, router])

  const handleAccept = async () => {
    if (!productId) {
      setError('No loan product selected.')
      return
    }

    if (hasInitializedAccount) {
      router.replace(loanApplyHref(productId))
      return
    }

    if (amountValidationError) {
      setError(amountValidationError)
      return
    }

    setProcessing(true)
    setError(null)
    try {
      const result = await initializeProductApplication(productId, { productType: 'LOAN'})
      if (!result.ok) {
        if (isDuplicateAccountError(result.error || '')) {
          router.replace(loanApplyHref(productId))
          return
        }
        setError(result.error || 'Could not set up your loan account.')
        return
      }

      router.replace(loanAccountSuccessHref(productId))
    } finally {
      setProcessing(false)
    }
  }

  if (checkingExisting) {
    return (
      <div className="flex h-full flex-col items-center justify-center sf-page-bg px-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
        <p className="mt-4 text-sm font-medium text-[var(--sf-ink,#1E293B)]">
          Checking your loan application...
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col sf-page-bg overflow-hidden">
      <div className="px-6 pt-12">
        <Link
          href="/mobile-v2/products/loan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center opacity-60">
        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">
          {hasInitializedAccount ? 'Continue Loan Application' : 'Create a Loan Account'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {hasInitializedAccount
            ? 'Your account has already been created. Continue to complete your application.'
            : 'Accept the terms to create your account before continuing to the application.'}
        </p>
      </div>

      <div className="absolute inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full rounded-t-[28px] bg-white px-6 pb-8 pt-3 shadow-2xl">
          <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-gray-300" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1E293B]">
              {hasInitializedAccount ? 'Continue Loan Application' : 'Create a Loan Account'}
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
              {hasInitializedAccount ? (
                <>
                  Your bank account with <strong>{providerName}</strong> is already active. Continue to complete your loan application.
                </>
              ) : (
                <>
                  Before you can proceed with <strong>this loan product</strong>, you are required to open a
                  bank account with <strong>{providerName}</strong>.
                </>
              )}
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
              <strong>{providerName}</strong> is a licensed financial institution by the Central
              Bank of Nigeria.
            </span>
          </div>

        

          <div className="mt-5 space-y-3 text-left text-xs text-gray-700">
            <button
              type="button"
              onClick={() => setTermsAccepted((v) => !v)}
              className="flex items-center gap-2"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  termsAccepted
                    ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                    : 'border-gray-400 bg-white'
                }`}
              >
                {termsAccepted ? <Check className="h-3 w-3" /> : null}
              </span>
              Accept Terms & Condition, Data Sharing with {providerName}
            </button>
            <button
              type="button"
              onClick={() => setPrivacyAccepted((v) => !v)}
              className="flex items-center gap-2"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  privacyAccepted
                    ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                    : 'border-gray-400 bg-white'
                }`}
              >
                {privacyAccepted ? <Check className="h-3 w-3" /> : null}
              </span>
              Accept Data Privacy & Use of Data
            </button>
          </div>

          {error || amountValidationError ? (
            <p className="mt-4 text-center text-xs text-red-600">{error || amountValidationError}</p>
          ) : null}

          <Button
            type="button"
            disabled={
              (!hasInitializedAccount &&
                (!termsAccepted || !privacyAccepted)) ||
              processing
            }
            className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] font-semibold text-white disabled:opacity-50"
            onClick={handleAccept}
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : hasInitializedAccount ? (
              'Continue to Loan Application'
            ) : (
              'Go ahead, Create Bank account'
            )}
          </Button>
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-gray-700"
            onClick={() => router.push('/mobile-v2/products/loan')}
          >
            No. Go back
          </button>
        </div>
      </div>
    </div>
  )
}

function LoanApplyStartFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center sf-page-bg">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
    </div>
  )
}

export default function LoanApplyStartPage() {
  return (
    <Suspense fallback={<LoanApplyStartFallback />}>
      <LoanApplyStartInner />
    </Suspense>
  )
}
