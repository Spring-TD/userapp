"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Filter, Search, UserPlus } from "lucide-react"

import { useMobileV2Tenant } from "@/contexts/MobileV2TenantContext"
import { useUserWallet } from "@/hooks/useUserWallet"
import {
  deleteReceiver,
  getSavedReceivers,
  type SavedReceiver,
  type SendDestinationType,
} from "@/lib/sendReceiversStore"

function receiverSubtitle(r: SavedReceiver): string {
  if (r.type === "bank") return `${r.accountNumber}  ${r.bankName}`
  if (r.type === "mobile_money") return `${r.phoneNumber}  ${r.providerName}`
  return `@${r.tag}`
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] || ""
  const b = parts[1]?.[0] || parts[0]?.[1] || ""
  const v = `${a}${b}`.toUpperCase()
  return v || "R"
}

export default function SendReceiversPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appId } = useMobileV2Tenant()
  const { wallet } = useUserWallet()
  const userId = wallet?.userId ?? null

  const type = (searchParams.get("type") || "bank") as SendDestinationType

  const [query, setQuery] = useState("")
  const [receivers, setReceivers] = useState<SavedReceiver[]>([])

  const load = () => {
    setReceivers(getSavedReceivers({ appId, userId }).filter((r) => r.type === type))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- storage read only
  }, [appId, userId, type])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return receivers
    return receivers.filter((r) => {
      const hay = [r.label, receiverSubtitle(r)].join(" ").toLowerCase()
      return hay.includes(q)
    })
  }, [receivers, query])

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
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#111827] shadow-sm"
          aria-label="Filter"
          disabled
        >
          <Filter className="h-4 w-4 opacity-40" />
        </button>
      </header>

      <main className="-mt-1 rounded-t-[8px] bg-white px-6 pb-10 pt-6 shadow-[0_-4px_20px_rgba(15,23,42,0.02)]">
        <p className="text-sm font-semibold text-[#111827]">Who are you sending to?</p>

        <button
          type="button"
          onClick={() => router.push(`/mobile-v2/send/new?type=${encodeURIComponent(type)}`)}
          className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#EEF0F6] bg-[#F4F6FF] text-sm font-semibold text-[#4F46E5]"
        >
          <UserPlus className="h-4 w-4" />
          Add new receiver
        </button>

        <label className="mt-4 flex h-[46px] items-center gap-3 rounded-2xl border border-[#EEF0F6] bg-[#FAFBFF] px-4">
          <Search className="h-4 w-4 text-[#94A3B8]" />
          <input
            type="search"
            placeholder="Name, Account number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-[#111827] outline-none placeholder:text-[#A0A7B5]"
          />
        </label>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#111827]">Saved receivers</p>
          <button type="button" className="inline-flex items-center gap-2 text-xs font-semibold text-[#111827]" disabled>
            <Filter className="h-4 w-4 opacity-40" />
            <span className="opacity-40">Filter by</span>
          </button>
        </div>

        <div className="mt-3 divide-y divide-[#EEF0F6] rounded-2xl border border-[#EEF0F6] bg-white">
          {visible.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-semibold text-[#111827]">
                {query.trim() ? "No matching receivers" : "No receivers yet"}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">
                {query.trim()
                  ? "Try a different name or identifier."
                  : "Add a receiver to start sending money."}
              </p>
            </div>
          ) : (
            visible.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] text-xs font-bold text-[#111827]">
                  {initialsFromLabel(r.label)}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/mobile-v2/send/new?type=${encodeURIComponent(type)}&prefill=${encodeURIComponent(r.id)}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-[#111827]">{r.label}</p>
                  <p className="mt-0.5 truncate text-xs text-[#6B7280]">{receiverSubtitle(r)}</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteReceiver({ appId, userId }, r.id)
                    load()
                  }}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

