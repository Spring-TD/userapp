"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

function SendOption({
  title,
  subtitle,
  onClick,
}: {
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[#EEF0F6] bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
    >
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>
    </button>
  )
}

export default function SendMoneyStartPage() {
  const router = useRouter()

  return (
    <div className="min-h-full bg-[#F5F6FB] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex h-[102px] items-end justify-between bg-[#F4F6FF] px-7 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#111827] shadow-sm"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="pb-1 text-[15px] font-semibold text-[#111827]">Send money</h1>
        <div className="h-8 w-8" aria-hidden />
      </header>

      <main className="-mt-1 rounded-t-[8px] bg-white px-6 pb-10 pt-6 shadow-[0_-4px_20px_rgba(15,23,42,0.02)]">
        <h2 className="text-sm font-semibold text-[#111827]">Where do you want to send money?</h2>

        <div className="mt-5 space-y-4">
          <SendOption
            title="Bank account"
            subtitle="Send money to any bank account"
            onClick={() => router.push("/mobile-v2/send/receivers?type=bank")}
          />
        </div>
      </main>
    </div>
  )
}

