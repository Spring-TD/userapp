'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const sk = 'bg-gray-200/90 dark:bg-gray-700/40'

/** Product hub (Feature + strip) while tenant/products load */
export function MobileV2ProductListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)} aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <Skeleton className={cn('h-6 w-28 rounded-lg', sk)} />
        <Skeleton className={cn('h-8 w-32 rounded-lg', sk)} />
      </div>
      <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm">
        <Skeleton className={cn('h-[200px] w-full rounded-none', sk)} />
        <div className="space-y-3 p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className={cn('h-5 flex-1 rounded-md', sk)} />
            <Skeleton className={cn('h-5 w-24 shrink-0 rounded-md', sk)} />
          </div>
          <Skeleton className={cn('h-3 w-full rounded-md', sk)} />
          <Skeleton className={cn('h-3 w-[85%] rounded-md', sk)} />
          <div className="flex gap-6 pt-1">
            <Skeleton className={cn('h-4 w-20 rounded-md', sk)} />
            <Skeleton className={cn('h-4 w-16 rounded-md', sk)} />
          </div>
          <Skeleton className={cn('mt-2 h-11 w-full rounded-full', sk)} />
          <div className="flex justify-center gap-1.5 pt-1">
            <Skeleton className={cn('h-1.5 w-5 rounded-full', sk)} />
            <Skeleton className={cn('h-1.5 w-1.5 rounded-full', sk)} />
            <Skeleton className={cn('h-1.5 w-1.5 rounded-full', sk)} />
          </div>
        </div>
      </div>
      <Skeleton className={cn('h-5 w-36 rounded-md', sk)} />
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-[200px] shrink-0 space-y-2">
            <Skeleton className={cn('h-[100px] w-full rounded-[18px]', sk)} />
            <Skeleton className={cn('h-3 w-full rounded-md', sk)} />
            <Skeleton className={cn('h-3 w-[66%] rounded-md', sk)} />
            <Skeleton className={cn('h-9 w-full rounded-full', sk)} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mortgage / product detail hero + body */
export function MortgageDetailSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-4" aria-busy="true" aria-live="polite">
      <Skeleton className={cn('aspect-[16/11] w-full rounded-[24px]', sk)} />
      <div className="flex justify-between gap-3 pt-2">
        <Skeleton className={cn('h-6 flex-1 rounded-md', sk)} />
        <Skeleton className={cn('h-6 w-28 shrink-0 rounded-md', sk)} />
      </div>
      <Skeleton className={cn('h-4 w-full rounded-md', sk)} />
      <Skeleton className={cn('h-4 w-full rounded-md', sk)} />
      <Skeleton className={cn('h-4 w-[75%] rounded-md', sk)} />
      <MotionlessMortgageDetailMeta />
      <MotionlessMortgageDetailRows />
    </div>
  )
}

function MotionlessMortgageDetailMeta() {
  return (
    <div className="flex gap-8 pt-2">
      <Skeleton className={cn('h-4 w-24 rounded-md', sk)} />
      <Skeleton className={cn('h-4 w-20 rounded-md', sk)} />
    </div>
  )
}

function MotionlessMortgageDetailRows() {
  return (
    <div className="space-y-3 border-t border-gray-200 pt-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-between gap-4">
          <Skeleton className={cn('h-4 w-28 rounded-md', sk)} />
          <Skeleton className={cn('h-4 w-24 rounded-md', sk)} />
        </div>
      ))}
    </div>
  )
}

/** Full-screen apply flow shell */
export function MortgageApplyFlowSkeleton() {
  return (
    <div className="min-h-[60vh] space-y-4 px-4 pt-24" aria-busy="true" aria-live="polite">
      <Skeleton className={cn('h-4 w-48 rounded-md', sk)} />
      <Skeleton className={cn('h-8 w-56 rounded-md', sk)} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className={cn('h-3 w-20 rounded-md', sk)} />
          <Skeleton className={cn('h-12 w-full rounded-2xl', sk)} />
        </div>
      ))}
      <Skeleton className={cn('mt-4 h-14 w-full rounded-full', sk)} />
    </div>
  )
}

export function MobileV2LayoutSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white p-6" aria-busy="true">
      <Skeleton className={cn('h-8 w-[75%] rounded-md', sk)} />
      <Skeleton className={cn('mt-6 h-12 w-full rounded-2xl', sk)} />
      <Skeleton className={cn('mt-4 h-12 w-full rounded-2xl', sk)} />
      <Skeleton className={cn('mt-8 h-40 w-full rounded-3xl', sk)} />
    </div>
  )
}

/** Home / accounts balance hero card */
export function WalletBalanceCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full h-[220px] rounded-[30px] overflow-hidden shadow-xl shadow-blue-900/10',
        className,
      )}
      aria-busy="true"
      aria-label="Loading wallet"
    >
      <div className="absolute inset-0 bg-[var(--sf-button,#1E40AF)]" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-4 px-4">
        <Skeleton className={cn('h-12 w-12 rounded-full mb-3 bg-white/25', sk)} />
        <Skeleton className={cn('h-4 w-40 rounded-md mb-2 bg-white/25', sk)} />
        <Skeleton className={cn('h-10 w-48 max-w-[70vw] rounded-lg mb-2 bg-white/25', sk)} />
        <Skeleton className={cn('h-3 w-56 max-w-[85vw] rounded-md bg-white/20', sk)} />
      </div>
    </div>
  )
}

/** Accounts list row */
export function WalletAccountRowSkeleton() {
  return (
    <div className="w-full rounded-[24px] sf-accent-soft p-6" aria-busy="true">
      <Skeleton className={cn('h-8 w-8 rounded-lg mb-4', sk)} />
      <Skeleton className={cn('h-4 w-32 rounded-md mb-2', sk)} />
      <Skeleton className={cn('h-8 w-36 rounded-md', sk)} />
    </div>
  )
}

/** Signup / auth screens waiting on `useSearchParams` */
export function AuthRouteSkeleton() {
  return (
    <div className="flex h-full flex-col sf-page-bg p-6 pt-16" aria-busy="true" aria-live="polite">
      <Skeleton className={cn('mx-auto mb-8 h-8 w-40 rounded-md', sk)} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className={cn('mb-4 h-14 w-full rounded-2xl', sk)} />
      ))}
      <Skeleton className={cn('mt-4 h-14 w-full rounded-full', sk)} />
    </div>
  )
}

/** Pending loan / mortgage applications list while data loads */
export function PendingApplicationsListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={cn('h-4 w-[68%] rounded-md', sk)} />
              <Skeleton className={cn('h-3 w-32 rounded-md', sk)} />
            </div>
            <div className="shrink-0 space-y-2 text-right">
              <Skeleton className={cn('ml-auto h-4 w-20 rounded-md', sk)} />
              <Skeleton className={cn('ml-auto h-3 w-16 rounded-md', sk)} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className={cn('h-10 flex-1 rounded-full', sk)} />
            <Skeleton className={cn('h-10 flex-1 rounded-full', sk)} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Pending loan / mortgage thread detail while application loads */
export function PendingApplicationThreadSkeleton({
  title = 'Pending application',
}: {
  title?: string
}) {
  return (
    <div className="flex min-h-full flex-col sf-page-bg-tint" aria-busy="true" aria-live="polite">
      <div className="flex-1 overflow-y-auto px-4 pb-32 pt-12 no-scrollbar">
        <div className="mb-6 grid grid-cols-3 items-center">
          <Skeleton className={cn('h-9 w-9 rounded-full', sk)} />
          <Skeleton className={cn('mx-auto h-5 w-32 rounded-md', sk)} aria-label={title} />
          <div />
        </div>

        <div className="mb-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <Skeleton className={cn('h-3 w-20 rounded-md', sk)} />
          <Skeleton className={cn('mt-3 h-5 w-[72%] rounded-md', sk)} />
          <Skeleton className={cn('mt-3 h-7 w-36 rounded-md', sk)} />
          <Skeleton className={cn('mt-3 h-3 w-24 rounded-md', sk)} />
        </div>

        <div className="rounded-2xl bg-white px-4 py-5 shadow-sm">
          <Skeleton className={cn('h-3 w-16 rounded-md', sk)} />
          <Skeleton className={cn('mt-2 h-3 w-full rounded-md', sk)} />
          <div className="mt-5 space-y-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className={cn('h-7 w-7 shrink-0 rounded-full', sk)} />
                <div className="min-w-0 flex-1 space-y-2 pb-2">
                  <Skeleton className={cn('h-4 w-[58%] rounded-md', sk)} />
                  <Skeleton className={cn('h-3 w-full rounded-md', sk)} />
                  <Skeleton className={cn('h-3 w-[88%] rounded-md', sk)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Skeleton className={cn('h-12 w-full rounded-full', sk)} />
      </div>
    </div>
  )
}
