"use client"

import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function MobileFlowHeader({
  title,
  onBack,
  rightSlot,
}: {
  title: string
  onBack?: () => void
  rightSlot?: React.ReactNode
}) {
  const router = useRouter()

  return (
    <header className="flex h-[102px] items-end justify-between bg-[#F4F6FF] px-7 pb-4">
      <button
        type="button"
        onClick={onBack ?? (() => router.back())}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#111827] shadow-sm"
        aria-label="Go back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="pb-1 text-[15px] font-semibold text-[#111827]">{title}</h1>
      {rightSlot ?? <div className="h-8 w-8" aria-hidden />}
    </header>
  )
}

export function MobileFlowShell({
  title,
  onBack,
  rightSlot,
  children,
}: {
  title: string
  onBack?: () => void
  rightSlot?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full bg-[#F5F6FB] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <MobileFlowHeader title={title} onBack={onBack} rightSlot={rightSlot} />
      <main className="-mt-1 rounded-t-[8px] bg-white px-6 pb-10 pt-6 shadow-[0_-4px_20px_rgba(15,23,42,0.02)]">
        {children}
      </main>
    </div>
  )
}
