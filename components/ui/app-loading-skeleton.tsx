import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/** Full viewport shell (sidebar + header + content) — e.g. merchant layout while KYC status loads. */
export function FullPageAppSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-screen w-full bg-gray-50", className)}>
      <div className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 md:block">
        <Skeleton className="mb-8 h-8 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-8">
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Short block while `/dashboard` redirects (fits existing `h-64` layout). */
export function DashboardRedirectSkeleton() {
  return (
    <div className="flex h-64 items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-4">
        <Skeleton className="mx-auto h-4 w-2/3" />
        <Skeleton className="mx-auto h-4 w-1/2" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  )
}

/** Stacked cards — pending applications queue. */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
            <div className="hidden shrink-0 space-y-2 sm:block">
              <Skeleton className="ml-auto h-4 w-24" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Customer rows — avatar + lines. */
export function CustomerListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Auth shell / Suspense fallback — form-shaped placeholders. */
export function AuthFormSkeleton() {
  return (
    <div className="w-full space-y-4 py-6">
      <Skeleton className="mx-auto h-7 w-48" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
    </div>
  )
}
