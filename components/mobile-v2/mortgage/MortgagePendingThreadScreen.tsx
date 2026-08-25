'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MortgageWorkflowModals } from '@/components/mobile-v2/mortgage/MortgageWorkflowModals'
import { VirtualTourSheet } from '@/components/mobile-v2/mortgage/VirtualTourSheet'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useSpringLocalProductForVirtualTour } from '@/hooks/useSpringLocalProductForVirtualTour'
import { useUserWallet } from '@/hooks/useUserWallet'
import {
  applicationUpstreamId,
  cancelStorefrontApplication,
  fetchUserApplications,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { pendingApprovedMortgageApi } from '@/lib/pendingApprovedMortgageApi'
import { buildPropertyTourData } from '@/lib/mortgagePropertyTour'
import { resolveSpringLocalProductLookup } from '@/lib/springLocalProduct'
import { isVirtualInspectionComplete, normalizeWorkflowStepId } from '@/lib/postApprovalMortgage'
import {
  buildMortgageThread,
  mortgageStepCta,
  mortgageStepToModal,
  resolveMortgageWorkflowStep,
  type MortgageThreadItem,
  type MortgageWorkflowModal,
} from '@/lib/mortgageWorkflow'
import type { WorkflowModalKind } from '@/components/mobile-v2/mortgage/MortgageWorkflowModals'
import { cn } from '@/lib/utils'

function formatAmount(application: StorefrontApplication) {
  const amount = application.amount
  const currency = application.currency || 'NGN'
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currency}0.00`
  return `${currency}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ThreadRow({
  item,
  onAction,
}: {
  item: MortgageThreadItem
  onAction?: () => void
}) {
  const isClickable = item.status === 'current' && Boolean(onAction)

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => onAction?.()}
      className={cn(
        'flex w-full gap-3 text-left',
        isClickable && 'cursor-pointer rounded-xl transition hover:bg-gray-50/80',
        !isClickable && 'cursor-default',
      )}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
            item.status === 'done'
              ? 'border-green-500 bg-green-500 text-white'
              : item.status === 'rejected'
                ? 'border-red-500 bg-red-500 text-white'
              : item.status === 'current'
                ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                : 'border-gray-200 bg-white text-gray-400',
          )}
        >
          {item.status === 'done' ? (
            <Check className="h-3.5 w-3.5" />
          ) : item.status === 'rejected' ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            item.stepNumber
          )}
        </div>
        <div className="mt-1 w-px flex-1 bg-gray-200 last:hidden" />
      </div>
      <div className={cn('min-w-0 flex-1 pb-6', item.status === 'upcoming' && 'opacity-50')}>
        <p
          className={cn(
            'text-sm font-semibold',
            item.status === 'current'
              ? 'text-[var(--sf-button,#1E40AF)]'
              : item.status === 'rejected'
                ? 'text-red-600'
                : 'text-[var(--sf-ink,#1E293B)]',
          )}
        >
          {item.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.description}</p>
        {item.status === 'current' ? (
          <span className="mt-2 inline-block rounded-full sf-accent-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--sf-button,#1E40AF)]">
            {isClickable ? 'Tap to continue' : 'In progress'}
          </span>
        ) : null}
        {item.status === 'current' && item.actionLabel && isClickable ? (
          <span className="mt-2 block text-[11px] font-semibold text-[var(--sf-button,#1E40AF)]">
            {item.actionLabel}
          </span>
        ) : null}
      </div>
    </button>
  )
}

type MortgagePendingThreadScreenProps = {
  application: StorefrontApplication
  backHref?: string
  /** When true, render only the workflow (no page chrome / duplicate summary). */
  embedded?: boolean
}

export function MortgagePendingThreadScreen({
  application,
  backHref = '/mobile-v2/products/mortgage/pending',
  embedded = false,
}: MortgagePendingThreadScreenProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { wallet } = useUserWallet()
  const applicationId = String(application.id ?? application._id ?? '')
  const productLookup = resolveSpringLocalProductLookup(application)
  const productId = productLookup.localProductId || String(application.productId ?? '')
  const [workflowVersion, setWorkflowVersion] = useState(0)
  const [activeModal, setActiveModal] = useState<WorkflowModalKind | null>(null)
  const [virtualTourOpen, setVirtualTourOpen] = useState(false)
  const [liveApplication, setLiveApplication] = useState<StorefrontApplication>(application)

  useEffect(() => {
    setLiveApplication(application)
  }, [application])

  // Keep approval / post-approval state fresh — pending page used to load once and miss Plata approve.
  useEffect(() => {
    const userId = wallet?.userId || String(application.userId || '').trim()
    if (!applicationId || !userId) return

    let cancelled = false

    const refreshLive = async () => {
      const [listRes, detailRes] = await Promise.all([
        fetchUserApplications(userId, { productType: 'MORTGAGE', limit: 100 }),
        pendingApprovedMortgageApi.getDetail(applicationId, userId),
      ])

      if (cancelled) return

      const fromList =
        listRes.ok
          ? listRes.applications.find((item) => String(item.id ?? item._id ?? '') === applicationId)
          : null

      const detail = detailRes.ok ? detailRes.data : null
      const detailApp = detail?.application
      const paf = detail?.postApprovalFulfillment || detailApp?.postApprovalFulfillment

      setLiveApplication((prev) => {
        const base = fromList || prev
        return {
          ...base,
          ...(fromList || {}),
          loanWorkflowStatus:
            fromList?.loanWorkflowStatus ||
            detailApp?.loanWorkflowStatus ||
            detail?.loanWorkflowStatus ||
            base.loanWorkflowStatus,
          status: fromList?.status || detailApp?.status || base.status,
          postApprovalFulfillment: (paf || base.postApprovalFulfillment) as StorefrontApplication['postApprovalFulfillment'],
          upstreamApplicationId:
            applicationUpstreamId(fromList) ||
            applicationUpstreamId(base) ||
            String(detail?.applicationId || '').trim() ||
            undefined,
        }
      })
    }

    void refreshLive()
    const timer = window.setInterval(() => {
      void refreshLive()
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [applicationId, application.userId, wallet?.userId, workflowVersion])

  // General product fields (amounts, equity, etc.)
  const { product: catalogProduct } = useMobileProductDetail({
    productId,
    enabled: Boolean(productId),
  })

  // Virtual inspection media must come from Spring local product detail / app catalog.
  const {
    product: springTourProduct,
    loading: springTourLoading,
    error: springTourError,
    refetch: refetchSpringTourProduct,
  } = useSpringLocalProductForVirtualTour({
    application: liveApplication,
    enabled: Boolean(productId || productLookup.appId),
  })

  useEffect(() => {
    console.log('[VirtualTour][SpringProduct] pending screen product state', {
      applicationId,
      productId,
      appId: productLookup.appId,
      springTourLoading,
      springTourError,
      springTourProductId: springTourProduct?.id,
      properties: springTourProduct?.properties,
    })
  }, [
    applicationId,
    productId,
    productLookup.appId,
    springTourError,
    springTourLoading,
    springTourProduct,
  ])

  const product = springTourProduct ?? catalogProduct

  void workflowVersion
  const currentStep = resolveMortgageWorkflowStep(liveApplication)
  const thread = buildMortgageThread(liveApplication)
  const workflowComplete = thread.every((item) => item.status === 'done' || item.status === 'rejected')
  const cta =
    productId && applicationId && !workflowComplete
      ? mortgageStepCta(currentStep, productId, applicationId, liveApplication)
      : null

  const tourData = useMemo(
    () => buildPropertyTourData(springTourProduct ?? product, liveApplication),
    [liveApplication, product, springTourProduct],
  )

  const openStepModal = useCallback(
    (step = currentStep) => {
      if (step === 'virtual_tour' || step === 'virtual_inspection') {
        console.log('[VirtualTour][SpringProduct] opening virtual tour — refetching Spring product')
        void refetchSpringTourProduct()
        setVirtualTourOpen(true)
        return
      }
      const modal = mortgageStepToModal(step)
      if (modal && modal !== 'virtual_tour' && modal !== 'virtual_inspection') {
        setActiveModal(modal)
      }
    },
    [currentStep, refetchSpringTourProduct],
  )

  const refreshWorkflow = useCallback(() => {
    setWorkflowVersion((value) => value + 1)
  }, [])

  useEffect(() => {
    if (embedded) return
    const action = searchParams.get('action') as MortgageWorkflowModal | null
    if (!action) return
    if (action === 'virtual_tour' || action === 'virtual_inspection') {
      setVirtualTourOpen(true)
    } else {
      setActiveModal(action)
    }
    router.replace(`/mobile-v2/products/mortgage/pending/${encodeURIComponent(applicationId)}`, {
      scroll: false,
    })
  }, [applicationId, embedded, router, searchParams])

  const handleVirtualTourComplete = () => {
    void (async () => {
      const userId = wallet?.userId || String(application.userId || '').trim()
      if (!userId) {
        toast.error('Sign in to complete the virtual tour.')
        return
      }

      const applyDetail = (detail: Awaited<ReturnType<typeof pendingApprovedMortgageApi.getDetail>>) => {
        if (!detail.ok) return null
        const paf = detail.data.postApprovalFulfillment
        setLiveApplication((prev) => ({
          ...prev,
          loanWorkflowStatus:
            detail.data.application?.loanWorkflowStatus ||
            detail.data.loanWorkflowStatus ||
            prev.loanWorkflowStatus,
          status: detail.data.application?.status || prev.status,
          postApprovalFulfillment: paf as StorefrontApplication['postApprovalFulfillment'],
        }))
        return paf
      }

      // Re-fetch first — backend may already be on offer_letter (complete would 409).
      const beforeRes = await pendingApprovedMortgageApi.getDetail(applicationId, userId)
      if (!beforeRes.ok) {
        toast.error(beforeRes.error || 'Could not load mortgage status')
        return
      }
      let paf = applyDetail(beforeRes)
      const stepId = normalizeWorkflowStepId(paf?.currentWorkflowStepId)
      const alreadyPastTour =
        isVirtualInspectionComplete(paf) ||
        (Boolean(stepId) &&
          stepId !== 'virtual_tour' &&
          stepId !== 'virtual_inspection' &&
          stepId !== 'application_submission' &&
          stepId !== 'merchant_decision' &&
          stepId !== 'review_approval')

      if (!alreadyPastTour) {
        const apiRes = await pendingApprovedMortgageApi.completeVirtualInspection(applicationId, userId)
        if (!apiRes.ok) {
          toast.error(apiRes.error || 'Virtual inspection complete failed', {
            description: `POST …/pending-approved-mortgage/virtual-inspection/complete${apiRes.status ? ` (${apiRes.status})` : ''}`,
          })
          return
        }
        const afterRes = await pendingApprovedMortgageApi.getDetail(applicationId, userId)
        if (!afterRes.ok) {
          toast.error(afterRes.error || 'Tour POST succeeded, but re-fetch failed', {
            description: 'GET …/pending-approved-mortgage',
          })
          return
        }
        paf = applyDetail(afterRes)
      }

      toast.success(alreadyPastTour ? 'Continuing to offer letter' : 'Virtual tour completed')
      refreshWorkflow()
    })()
  }

  const handleVirtualTourCancel = async (reason?: string) => {
    const userId = wallet?.userId || String(application.userId || '').trim()
    if (!userId) {
      toast.error('Sign in to cancel this application.')
      return
    }
    const res = await cancelStorefrontApplication(applicationId, userId, reason)
    if (!res.ok) {
      toast.error(res.error || 'Could not cancel application on the server', {
        description: 'PATCH …/applications/:id (CANCELLED)',
      })
      return
    }
    toast.success('Application cancelled')
    refreshWorkflow()
    if (!embedded) {
      router.push('/mobile-v2/accounts')
    }
  }

  const workflowCard = (
    <div className="rounded-2xl border sf-border-subtle bg-white px-4 py-5 shadow-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Workflow</p>
      <p className="mb-4 text-xs text-gray-500">
        Follow each step below. Tap the current step to continue.
      </p>
      {thread.map((item) => (
        <ThreadRow
          key={item.step}
          item={item}
          onAction={item.status === 'current' && cta ? () => openStepModal(item.step) : undefined}
        />
      ))}
      {embedded && cta ? (
        <Button
          className="mt-2 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
          onClick={() => openStepModal()}
        >
          {cta.label}
        </Button>
      ) : null}
    </div>
  )

  const modals = (
    <>
      <VirtualTourSheet
        open={virtualTourOpen}
        onClose={() => setVirtualTourOpen(false)}
        tour={tourData}
        onComplete={handleVirtualTourComplete}
        onCancelApplication={handleVirtualTourCancel}
      />

      <MortgageWorkflowModals
        active={activeModal}
        onClose={() => setActiveModal(null)}
        applicationId={applicationId}
        productId={productId}
        product={product}
        onStepAdvanced={refreshWorkflow}
      />
    </>
  )

  if (embedded) {
    return (
      <div key={workflowVersion}>
        {workflowCard}
        {modals}
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col sf-page-bg-tint" key={workflowVersion}>
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-12 no-scrollbar">
        <div className="mb-6 grid grid-cols-3 items-center">
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-center text-base font-bold text-gray-950 whitespace-nowrap">Pending Mortgage</h1>
          <div />
        </div>

        <div className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Application</p>
          <h2 className="mt-1 text-base font-bold text-[var(--sf-ink,#1E293B)]">
            {liveApplication.productName || product?.name || 'Mortgage application'}
          </h2>
          <p className="mt-2 text-lg font-bold text-[var(--sf-button,#1E40AF)]">{formatAmount(liveApplication)}</p>
          {currentStep === 'merchant_decision' ? (
            <p className="mt-2 text-xs text-amber-700">
              Waiting for the merchant to approve or reject — this screen refreshes automatically.
            </p>
          ) : null}
        </div>

        {workflowCard}
      </div>

      {cta ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:left-1/2 md:w-[400px] md:-translate-x-1/2">
          <Button
            className="h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
            onClick={() => openStepModal()}
          >
            {cta.label}
          </Button>
        </div>
      ) : null}

      {modals}
    </div>
  )
}
