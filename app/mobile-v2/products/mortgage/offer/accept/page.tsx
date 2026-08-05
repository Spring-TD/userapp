'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MortgageSheet, MORTGAGE_PRIMARY } from '@/components/mobile-v2/mortgage/MortgageSheet'
import { mortgagePendingDetailHref } from '@/lib/mortgageApplyRoutes'
import { patchMortgageWorkflowAsync } from '@/lib/mortgageWorkflow'
import { extractOfferLetterFromRecord } from '@/lib/offerLetter'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import { useUserWallet } from '@/hooks/useUserWallet'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function AcceptOfferContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wallet } = useUserWallet()
  const userId = wallet?.userId
  const productId = sanitizeProductId(searchParams.get('productId'))
  const applicationId = searchParams.get('applicationId')?.trim() || ''
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [offerPdfUrl, setOfferPdfUrl] = useState<string | null>(null)
  const [offerPdfName, setOfferPdfName] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !applicationId) return
    let cancelled = false
    void pendingApprovedMortgageApi.getDetail(applicationId, userId).then((res) => {
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
  }, [applicationId, userId])

  if (!productId || !applicationId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-gray-600">Missing offer details.</p>
        <Link href="/mobile-v2/products/mortgage/pending" className="text-sm font-semibold text-[var(--sf-button,#1E40AF)]">
          Pending mortgage
        </Link>
      </div>
    )
  }

  const pendingHref = mortgagePendingDetailHref(applicationId)

  const acceptOffer = async () => {
    if (!termsAccepted) {
      toast.error('Accept the terms and conditions to continue.')
      return
    }
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
      const local = await patchMortgageWorkflowAsync(applicationId, {
        offerAccepted: true,
        offerDeclined: false,
      })
      if (!local) {
        toast.error('Could not save workflow progress.')
        return
      }
      if (!local.synced) {
        toast.error(local.syncError || 'Workflow sync failed', {
          description: 'PATCH …/loan-workflow (mortgageWorkflow)',
        })
        return
      }
      toast.success('Mortgage offer accepted')
      setSheetOpen(false)
      router.replace(pendingHref)
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
      const local = await patchMortgageWorkflowAsync(applicationId, {
        offerDeclined: true,
        offerAccepted: false,
      })
      if (!local) {
        toast.error('Could not save workflow progress.')
        return
      }
      if (!local.synced) {
        toast.error(local.syncError || 'Workflow sync failed', {
          description: 'PATCH …/loan-workflow (mortgageWorkflow)',
        })
        return
      }
      toast.message('Offer declined')
      setSheetOpen(false)
      router.replace(pendingHref)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col sf-page-bg">
      <div className="px-5 pt-10">
        <Link
          href={pendingHref}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>

      <MortgageSheet open={sheetOpen} onClose={() => router.push(pendingHref)}>
        <div className="px-1 pb-2 pt-2">
          <h2 className="text-center text-lg font-bold text-[var(--sf-ink,#1E293B)]">Mortgage offer</h2>
          <p className="mx-auto mt-3 max-w-xs text-center text-sm leading-relaxed text-gray-500">
            Your mortgage loan offer letter has been sent to your email. Review the offer below and
            choose whether to accept or decline.
          </p>

          {offerPdfUrl ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 h-11 w-full rounded-full border-gray-200 text-sm font-semibold"
              onClick={() => {
                const a = document.createElement('a')
                a.href = offerPdfUrl
                a.download = offerPdfName || 'mortgage-offer-letter.pdf'
                a.target = '_blank'
                a.rel = 'noopener noreferrer'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download offer letter
            </Button>
          ) : null}

          <div className="mt-5 rounded-2xl border sf-border-brand sf-accent-soft px-4 py-4 text-sm text-gray-700">
            <p className="font-semibold text-[var(--sf-ink,#1E293B)]">Offer summary</p>
            <p className="mt-2 text-xs leading-relaxed">
              Subject to final verification, your mortgage offer is ready. Accept to schedule property
              inspection and continue with down payment and contract signing.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTermsAccepted((v) => !v)}
            className="mt-5 flex w-full items-start gap-3 text-left text-xs text-gray-700"
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                termsAccepted
                  ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                  : 'border-gray-400 bg-white',
              )}
            >
              {termsAccepted ? <Check className="h-3 w-3" /> : null}
            </span>
            <span>Accept Terms &amp; Conditions for this mortgage offer</span>
          </button>

          <div className="mt-8 space-y-3">
            <Button
              className={cn('h-12 w-full rounded-full text-sm font-semibold', MORTGAGE_PRIMARY)}
              disabled={!termsAccepted || busy}
              onClick={() => void acceptOffer()}
            >
              Accept offer
            </Button>
            <Button
              variant="outline"
              className="h-12 w-full rounded-full border-gray-200 text-sm font-semibold text-red-600"
              onClick={() => void declineOffer()}
            >
              Decline offer
            </Button>
          </div>
        </div>
      </MortgageSheet>
    </div>
  )
}

export default function MortgageAcceptOfferPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">Loading…</div>}>
      <AcceptOfferContent />
    </Suspense>
  )
}
