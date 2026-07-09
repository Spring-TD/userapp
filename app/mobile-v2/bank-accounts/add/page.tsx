"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"

import { MobileFlowShell } from "@/components/mobile-v2/MobileFlowShell"
import { useUserWallet } from "@/hooks/useUserWallet"
import {
  addExternalBankAccount,
  fetchBanks,
  nameEnquiry,
} from "@/lib/services/externalBankAccountApi"
import type { BankPickerItem } from "@/types/externalBankAccount"

export default function AddBankAccountPage() {
  const router = useRouter()
  const { wallet } = useUserWallet()
  const userId = wallet?.userId ?? null

  const [banks, setBanks] = useState<BankPickerItem[]>([])
  const [banksLoading, setBanksLoading] = useState(true)
  const [bankQuery, setBankQuery] = useState("")
  const [selectedBank, setSelectedBank] = useState<BankPickerItem | null>(null)
  const [showBankList, setShowBankList] = useState(false)

  const [accountNumber, setAccountNumber] = useState("")
  const [label, setLabel] = useState("")
  const [verifiedName, setVerifiedName] = useState<string | null>(null)

  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquiryError, setEnquiryError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void fetchBanks().then((result) => {
      setBanks(result.banks)
      setBanksLoading(false)
      if (result.error) setEnquiryError(result.error)
    })
  }, [])

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase()
    if (!q) return banks
    return banks.filter((b) => b.name.toLowerCase().includes(q))
  }, [banks, bankQuery])

  const digitsOnly = accountNumber.replace(/\D/g, "")
  const accountValid = digitsOnly.length === 10

  useEffect(() => {
    setVerifiedName(null)
    setEnquiryError(null)
  }, [selectedBank?.code, digitsOnly])

  const runNameEnquiry = async () => {
    if (!selectedBank || !accountValid) return
    setEnquiryLoading(true)
    setEnquiryError(null)
    setVerifiedName(null)

    const result = await nameEnquiry({
      accountNumber: digitsOnly,
      bankCode: selectedBank.code,
      currency: "NGN",
    })

    setEnquiryLoading(false)
    if (result.error) {
      setEnquiryError(result.error)
      return
    }
    setVerifiedName(result.result?.accountName ?? null)
  }

  const canSave = Boolean(selectedBank && accountValid && verifiedName && userId)

  const handleSave = async () => {
    if (!canSave || !userId || !selectedBank || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await addExternalBankAccount(userId, {
      bankName: selectedBank.name,
      bankCode: selectedBank.code,
      accountNumber: digitsOnly,
      accountName: verifiedName ?? undefined,
      currency: "NGN",
      label: label.trim() || undefined,
    })

    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      return
    }

    router.replace("/mobile-v2/bank-accounts")
  }

  return (
    <MobileFlowShell title="Add bank account">
      <p className="text-sm text-[#6B7280]">
        Choose your bank and enter your 10-digit account number. We verify the account is registered in your name.
      </p>

      <div className="mt-5 space-y-4">
        <div className="relative">
          <label className="text-xs font-semibold text-[#111827]">Bank</label>
          <button
            type="button"
            onClick={() => setShowBankList((v) => !v)}
            className="mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 text-left text-sm text-[#111827]"
          >
            <span className={selectedBank ? "" : "text-[#9CA3AF]"}>
              {selectedBank?.name || (banksLoading ? "Loading banks…" : "Select bank")}
            </span>
          </button>

          {showBankList ? (
            <div className="absolute z-20 mt-2 max-h-64 w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
              <label className="flex items-center gap-2 border-b border-[#EEF0F6] px-3 py-2">
                <Search className="h-4 w-4 text-[#94A3B8]" />
                <input
                  value={bankQuery}
                  onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Search banks"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
              </label>
              <ul className="max-h-52 overflow-y-auto">
                {filteredBanks.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[#6B7280]">No banks found</li>
                ) : (
                  filteredBanks.map((b) => (
                    <li key={b.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBank(b)
                          setShowBankList(false)
                          setBankQuery("")
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-[#F4F6FF]"
                      >
                        {b.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-semibold text-[#111827]">Account number</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit account number"
            inputMode="numeric"
            className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
          />
          {digitsOnly.length > 0 && !accountValid ? (
            <p className="mt-1 text-xs text-amber-700">Account number must be exactly 10 digits.</p>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-semibold text-[#111827]">Nickname (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 80))}
            placeholder="e.g. My salary account"
            className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
          />
        </div>

        <button
          type="button"
          disabled={!selectedBank || !accountValid || enquiryLoading}
          onClick={() => void runNameEnquiry()}
          className="h-11 w-full rounded-xl border border-[#4F46E5] bg-[#EEF2FF] text-sm font-semibold text-[#4F46E5] disabled:opacity-50"
        >
          {enquiryLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying account…
            </span>
          ) : (
            "Verify account name"
          )}
        </button>

        {enquiryError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{enquiryError}</div>
        ) : null}

        {verifiedName ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold text-emerald-800">Account name</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{verifiedName}</p>
          </div>
        ) : null}

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={!canSave || submitting}
        onClick={() => void handleSave()}
        className={`mt-6 h-12 w-full rounded-xl text-sm font-semibold ${
          canSave && !submitting ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
        }`}
      >
        {submitting ? "Saving…" : "Save bank account"}
      </button>
    </MobileFlowShell>
  )
}
