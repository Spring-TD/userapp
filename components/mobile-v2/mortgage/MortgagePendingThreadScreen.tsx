'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MortgageWorkflowModals } from '@/components/mobile-v2/mortgage/MortgageWorkflowModals'
import { VirtualTourSheet } from '@/components/mobile-v2/mortgage/VirtualTourSheet'
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail'
import { useSpringLocalProductForVirtualTour } from '@/hooks/useSpringLocalProductForVirtualTour'
import { useUserWallet } from '@/hooks/useUserWallet'
import {
  cancelStorefrontApplication,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'
import { buildPropertyTourData } from '@/lib/mortgagePropertyTour'
import { resolveSpringLocalProductLookup } from '@/lib/springLocalProduct'
import {
  buildMortgageThread,
  mortgageStepCta,
  mortgageStepToModal,
  patchMortgageWorkflowAsync,
  readMortgageWorkflow,
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
              : item.status === 'current'
                ? 'border-[var(--sf-button,#1E40AF)] bg-[var(--sf-button,#1E40AF)] text-white'
                : 'border-gray-200 bg-white text-gray-400',
          )}
        >
          {item.status === 'done' ? <Check className="h-3.5 w-3.5" /> : item.stepNumber}
        </div>
        <div className="mt-1 w-px flex-1 bg-gray-200 last:hidden" />
      </div>
      <div className={cn('min-w-0 flex-1 pb-6', item.status === 'upcoming' && 'opacity-50')}>
        <p
          className={cn(
            'text-sm font-semibold',
            item.status === 'current' ? 'text-[var(--sf-button,#1E40AF)]' : 'text-[var(--sf-ink,#1E293B)]',
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
    application,
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

  const local = readMortgageWorkflow(applicationId)
  const currentStep = resolveMortgageWorkflowStep(application, local)
  const thread = buildMortgageThread(currentStep, { workflowComplete: Boolean(local?.allocationDownloaded) })
  const cta =
    productId && applicationId && !local?.allocationDownloaded
      ? mortgageStepCta(currentStep, productId, applicationId)
      : null

  const tourData = useMemo(
    () => buildPropertyTourData(springTourProduct ?? product, application),
    [application, product, springTourProduct],
  )

  const propertyValue = product?.properties?.[0]?.value ?? product?.propertyValue ?? product?.amountMax ?? application.amount
  const downPaymentPercent = product?.equityContribution ?? 10

  const openStepModal = useCallback(
    (step = currentStep) => {
      if (step === 'virtual_tour') {
        console.log('[VirtualTour][SpringProduct] opening virtual tour — refetching Spring product')
        void refetchSpringTourProduct()
        setVirtualTourOpen(true)
        return
      }
      const modal = mortgageStepToModal(step)
      if (modal && modal !== 'virtual_tour') {
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
    if (action === 'virtual_tour') {
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
      const result = await patchMortgageWorkflowAsync(applicationId, { virtualTourCompleted: true })
      if (!result) {
        toast.error('Could not save virtual tour progress. Please try again.')
        return
      }
      refreshWorkflow()
      if (!result.synced) {
        toast.error('Tour saved on this device, but the bank did not receive it', {
          description: result.syncError || 'Open this screen again later, or contact support if Plata stays on Virtual Inspection.',
        })
        return
      }
      toast.success('Virtual tour completed — waiting for the bank to update')
    })()
  }

  const handleVirtualTourCancel = async (reason?: string) => {
    const userId = wallet?.userId || String(application.userId || '').trim()
    await patchMortgageWorkflowAsync(applicationId, {
      cancelled: true,
      offerDeclined: true,
      ...(reason ? { cancelReason: reason } : {}),
    })
    if (userId) {
      const res = await cancelStorefrontApplication(applicationId, userId, reason)
      if (!res.ok) {
        toast.message('Application cancelled locally', {
          description: res.error || 'Server cancel may still be pending.',
        })
      } else {
        toast.success('Application cancelled')
      }
    } else {
      toast.success('Application cancelled')
    }
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
        propertyValue={propertyValue}
        downPaymentPercent={downPaymentPercent}
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
            {application.productName || product?.name || 'Mortgage application'}
          </h2>
          <p className="mt-2 text-lg font-bold text-[var(--sf-button,#1E40AF)]">{formatAmount(application)}</p>
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
