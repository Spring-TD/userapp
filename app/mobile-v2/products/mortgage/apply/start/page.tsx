'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { initializeProductApplication } from '@/lib/storefrontApplicationClient'
import { mortgageAccountSuccessHref, mortgageApplyHref } from '@/lib/mortgageApplyRoutes'
import {
  isDuplicateAccountError,
  pendingAccountMessage,
  resolveProductApplicationAccount,
} from '@/lib/resolveProductApplicationAccount'
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'

function MortgageApplyStartInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { displayName, tenantSubdomain } = useMobileV2Tenant()
  const rawProductId = searchParams.get('productId') ?? ''
  const productId = sanitizeProductId(rawProductId)
  const providerName = displayName || tenantSubdomain || 'Provider'
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [hasInitializedAccount, setHasInitializedAccount] = useState(false)
  const [isActiveAccount, setIsActiveAccount] = useState(false)
  const [provisionStatus, setProvisionStatus] = useState<string | null>(null)

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
        if (!userId) {
          if (!cancelled) {
            setError('Could not resolve your user session. Please sign in again.')
            toast.error('Could not resolve your user session. Please sign in again.')
          }
          return
        }

        const resolved = await resolveProductApplicationAccount(userId, productId)
        if (cancelled) return

        console.log('[MortgageApplyStart] resolveProductApplicationAccount', resolved)

        setHasInitializedAccount(resolved.hasAccount)
        setIsActiveAccount(resolved.isActiveAccount)
        setProvisionStatus(resolved.provisionStatus ?? null)

        // Only continue into the application form when the product account is Active.
        if (resolved.hasAccount && resolved.isActiveAccount) {
          toast.success('Active mortgage account found. Continuing application…')
          router.replace(mortgageApplyHref(productId))
          return
        }

        if (resolved.hasAccount && !resolved.isActiveAccount) {
          const msg = pendingAccountMessage('mortgage')
          setError(msg)
          toast.message(msg)
        }
      } catch (err) {
        console.warn('Could not check existing initialized mortgage application:', err)
        if (!cancelled) {
          const msg = 'Could not verify your mortgage account status. Please try again.'
          setError(msg)
          toast.error(msg)
        }
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
      const msg = 'No mortgage product selected.'
      setError(msg)
      toast.error(msg)
      return
    }

    if (!termsAccepted || !privacyAccepted) {
      const msg = 'Please accept Terms & Conditions and Data Privacy to continue.'
      setError(msg)
      toast.error(msg)
      return
    }

    if (hasInitializedAccount && isActiveAccount) {
      toast.success('Continuing to your mortgage application…')
      router.replace(mortgageApplyHref(productId))
      return
    }

    if (hasInitializedAccount && !isActiveAccount) {
      setProcessing(true)
      setError(null)
      try {
        const userId = await resolveWalletUserId()
        if (!userId) {
          const msg = 'Could not resolve your user session. Please sign in again.'
          setError(msg)
          toast.error(msg)
          return
        }
        const resolved = await resolveProductApplicationAccount(userId, productId)
        console.log('[MortgageApplyStart] re-check account status', resolved)
        setHasInitializedAccount(resolved.hasAccount)
        setIsActiveAccount(resolved.isActiveAccount)
        setProvisionStatus(resolved.provisionStatus ?? null)
        if (resolved.isActiveAccount) {
          toast.success('Your mortgage account is Active. Continuing application…')
          router.replace(mortgageApplyHref(productId))
          return
        }
        const msg = pendingAccountMessage('mortgage')
        setError(msg)
        toast.message(msg)
      } catch (err) {
        console.error('[MortgageApplyStart] status re-check failed', err)
        const msg = 'Could not refresh account status. Please try again.'
        setError(msg)
        toast.error(msg)
      } finally {
        setProcessing(false)
      }
      return
    }

    setProcessing(true)
    setError(null)
    try {
      const result = await initializeProductApplication(productId, { productType: 'MORTGAGE' })
      console.log('[MortgageApplyStart] initializeProductApplication result', result)

      if (!result.ok) {
        if (isDuplicateAccountError(result.error || '')) {
          const userId = await resolveWalletUserId()
          const resolved = userId ? await resolveProductApplicationAccount(userId, productId) : null
          if (resolved?.isActiveAccount) {
            toast.success('You already have an active mortgage account. Continuing application…')
            router.replace(mortgageApplyHref(productId))
            return
          }
          const msg =
            resolved?.hasAccount
              ? pendingAccountMessage('mortgage')
              : result.error || 'Account already exists but is not Active yet.'
          setError(msg)
          toast.error(msg)
          setHasInitializedAccount(Boolean(resolved?.hasAccount))
          setIsActiveAccount(Boolean(resolved?.isActiveAccount))
          setProvisionStatus(resolved?.provisionStatus ?? null)
          return
        }
        const msg = result.error || 'Could not set up your mortgage account.'
        setError(msg)
        toast.error(msg)
        return
      }

      toast.success('Mortgage account request submitted successfully.')
      router.replace(mortgageAccountSuccessHref(productId))
    } catch (err) {
      console.error('[MortgageApplyStart] create account failed', err)
      const msg = err instanceof Error && err.message ? err.message : 'Could not set up your mortgage account.'
      setError(msg)
      toast.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  if (checkingExisting) {
    return (
      <div className="flex h-full flex-col items-center justify-center sf-page-bg px-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sf-button,#1E40AF)]" />
        <p className="mt-4 text-sm font-medium text-[var(--sf-ink,#1E293B)]">
          Checking your mortgage application...
        </p>
      </div>
    )
  }

  const pendingOnly = hasInitializedAccount && !isActiveAccount

  return (
    <div className="relative flex h-full flex-col overflow-hidden sf-page-bg">
      <div className="px-6 pt-12">
        <Link
          href="/mobile-v2/products/mortgage"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center opacity-60">
        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">
          {pendingOnly
            ? 'Account pending'
            : hasInitializedAccount
              ? 'Continue Mortgage Application'
              : 'Create a Mortgage Account'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {pendingOnly
            ? 'Your account request is in progress. Apply once it becomes Active.'
            : hasInitializedAccount
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
              {pendingOnly
                ? 'Mortgage account not Active yet'
                : hasInitializedAccount
                  ? 'Continue Mortgage Application'
                  : 'Create a Mortgage Account'}
            </h2>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-gray-500">
              {pendingOnly ? (
                <>
                  Status: <strong>{provisionStatus || 'ACCOUNT_REQUESTED'}</strong>. You cannot submit a
                  mortgage application until this account is <strong>Active</strong>.
                </>
              ) : hasInitializedAccount ? (
                <>
                  Your bank account with <strong>{providerName}</strong> is already active. Continue to
                  complete your mortgage application.
                </>
              ) : (
                <>
                  Before you can proceed with <strong>Mortgage product</strong>, you are required to open
                  a bank account with <strong>{providerName}</strong>.
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
              <strong>{providerName}</strong> is a licensed financial institution by the Central Bank of
              Nigeria.
            </span>
          </div>

          {!pendingOnly ? (
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
          ) : null}

          {error ? <p className="mt-4 text-center text-xs text-red-600">{error}</p> : null}

          <Button
            type="button"
            disabled={processing}
            className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] font-semibold text-white disabled:opacity-50"
            onClick={() => void handleAccept()}
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </span>
            ) : pendingOnly ? (
              'Check status again'
            ) : hasInitializedAccount ? (
              'Continue to Mortgage Application'
            ) : (
              'Go ahead, Create Bank account'
            )}
          </Button>
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-gray-700"
            onClick={() => router.push(pendingOnly ? '/mobile-v2/accounts' : '/mobile-v2/products/mortgage')}
          >
            {pendingOnly ? 'View My Accounts' : 'No. Go back'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MortgageApplyStartFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center sf-page-bg">
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
