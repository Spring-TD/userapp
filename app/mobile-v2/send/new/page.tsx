"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { useMobileV2Tenant } from "@/contexts/MobileV2TenantContext"
import { useUserWallet } from "@/hooks/useUserWallet"
import {
  getSavedReceivers,
  saveReceiver,
  type SavedReceiver,
  type SendDestinationType,
} from "@/lib/sendReceiversStore"

const NIGERIAN_BANKS = [
  "Access Bank",
  "First Bank",
  "GTBank",
  "Kuda",
  "PalmPay",
  "UBA",
  "Zenith Bank",
  "9mobile 9payment Service Bank",
]

function fieldLabel(type: SendDestinationType) {
  if (type === "bank") return "Enter receiver details"
  if (type === "mobile_money") return "Enter receiver details"
  return "Enter receiver details"
}

export default function NewReceiverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { appId } = useMobileV2Tenant()
  const { wallet } = useUserWallet()
  const userId = wallet?.userId ?? null

  const type = (searchParams.get("type") || "bank") as SendDestinationType
  const prefillId = searchParams.get("prefill")

  const [saveForNextTime, setSaveForNextTime] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const savedPrefill: SavedReceiver | null = useMemo(() => {
    if (!prefillId) return null
    return getSavedReceivers({ appId, userId }).find((r) => r.id === prefillId) ?? null
  }, [appId, userId, prefillId])

  // bank fields
  const [currency, setCurrency] = useState("Nigerian Naira")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")

  // mobile money fields
  const [providerName, setProviderName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  // tag fields
  const [tag, setTag] = useState("")

  useEffect(() => {
    if (!savedPrefill) return
    if (savedPrefill.type === "bank") {
      setCurrency(savedPrefill.currency || "Nigerian Naira")
      setBankName(savedPrefill.bankName || "")
      setAccountNumber(savedPrefill.accountNumber || "")
      setAccountName(savedPrefill.accountName || "")
    } else if (savedPrefill.type === "mobile_money") {
      setProviderName(savedPrefill.providerName || "")
      setPhoneNumber(savedPrefill.phoneNumber || "")
      setAccountName(savedPrefill.accountName || "")
    } else {
      setTag(savedPrefill.tag || "")
    }
    setSaveForNextTime(false)
  }, [savedPrefill])

  const canContinue = useMemo(() => {
    if (type === "bank") {
      return bankName.trim() && accountNumber.trim().length >= 8 && accountName.trim()
    }
    if (type === "mobile_money") {
      return providerName.trim() && phoneNumber.trim().length >= 7
    }
    return tag.trim().length >= 2
  }, [type, bankName, accountNumber, accountName, providerName, phoneNumber, tag])

  const handleContinue = async () => {
    if (!canContinue || submitting) return
    setSubmitting(true)
    try {
      if (saveForNextTime) {
        if (type === "bank") {
          saveReceiver(
            { appId, userId },
            {
              type: "bank",
              label: accountName.trim(),
              currency,
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              accountName: accountName.trim(),
            },
          )
        } else if (type === "mobile_money") {
          saveReceiver(
            { appId, userId },
            {
              type: "mobile_money",
              label: accountName.trim() || providerName.trim(),
              providerName: providerName.trim(),
              phoneNumber: phoneNumber.trim(),
              accountName: accountName.trim() || undefined,
            },
          )
        } else {
          saveReceiver(
            { appId, userId },
            {
              type: "raenest_tag",
              label: tag.trim().startsWith("@") ? tag.trim().slice(1) : tag.trim(),
              tag: tag.trim().startsWith("@") ? tag.trim().slice(1) : tag.trim(),
            },
          )
        }
      }

      // Next step (amount/confirmation) not included in screenshots yet.
      // For now, return to receivers list.
      router.push(`/mobile-v2/send/receivers?type=${encodeURIComponent(type)}`)
    } finally {
      setSubmitting(false)
    }
  }

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
        <h2 className="text-sm font-semibold text-[#111827]">{fieldLabel(type)}</h2>

        {type === "bank" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#111827]">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827]"
              >
                <option value="Nigerian Naira">Nigerian Naira</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827]">Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827]"
              >
                <option value="">Select bank</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827]">Account number</label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter account number"
                inputMode="numeric"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827]">Account name</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter your Account name"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
        ) : type === "mobile_money" ? (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#111827]">Provider</label>
              <input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. PalmPay"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827]">Phone number</label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                inputMode="tel"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#111827]">Account name (optional)</label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Enter account name"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#111827]">Raenest tag</label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. @stanley"
                className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
              />
            </div>
          </div>
        )}

        <label className="mt-6 flex items-center gap-3 text-sm text-[#111827]">
          <input
            type="checkbox"
            checked={saveForNextTime}
            onChange={(e) => setSaveForNextTime(e.target.checked)}
            className="h-5 w-5 rounded border-[#D1D5DB]"
          />
          Save this receiver for next time
        </label>

        <button
          type="button"
          disabled={!canContinue || submitting}
          onClick={() => void handleContinue()}
          className={`mt-6 h-12 w-full rounded-xl text-sm font-semibold ${
            canContinue && !submitting
              ? "bg-[#111827] text-white"
              : "bg-[#E5E7EB] text-[#9CA3AF]"
          }`}
        >
          {submitting ? "Processing..." : "Continue"}
        </button>
      </main>
    </div>
  )
}

