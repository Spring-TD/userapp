"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"

import { MobileFlowShell } from "@/components/mobile-v2/MobileFlowShell"
import { PinInput } from "@/components/mobile-v2/transaction-pin/PinInput"
import { useUserWallet } from "@/hooks/useUserWallet"
import { formatWalletBalance, walletSpendableBalance } from "@/lib/userWallet"
import {
  fetchExternalBankAccounts,
  fetchTransactionPinStatus,
  payoutToSavedAccount,
} from "@/lib/services/externalBankAccountApi"
import type { SavedExternalBankAccount } from "@/types/externalBankAccount"

function accountLabel(a: SavedExternalBankAccount): string {
  return a.label?.trim() || `${a.bankName} · ${a.accountNumber}`
}

export default function WithdrawPage() {
  const router = useRouter()
  const { wallet, formattedBalance, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const userId = wallet?.userId ?? null
  const balance = walletSpendableBalance(wallet)
  const currency = wallet?.currency || "NGN"

  const [accounts, setAccounts] = useState<SavedExternalBankAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [pin, setPin] = useState("")
  const [narration, setNarration] = useState("Withdrawal")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pinRequired, setPinRequired] = useState(false)
  const [pinLocked, setPinLocked] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      const [accountsResult, pinResult] = await Promise.all([
        fetchExternalBankAccounts(userId),
        fetchTransactionPinStatus(userId),
      ])
      if (cancelled) return

      const active = accountsResult.accounts.filter((a) => a.status !== "deleted")
      setAccounts(active)
      const defaultAccount = active.find((a) => a.isDefault) ?? active[0] ?? null
      setSelectedId(defaultAccount?.id ?? null)
      setError(accountsResult.error)

      if (pinResult.status) {
        setPinRequired(!pinResult.status.hasTransactionPin)
        setPinLocked(pinResult.status.locked)
        setLockedUntil(pinResult.status.lockedUntil)
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  const amountNum = useMemo(() => {
    const n = Number(amount.replace(/,/g, ""))
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const amountValid = amountNum > 0 && amountNum <= balance
  const pinValid = pin.length === 4
  const canSubmit = Boolean(userId && selectedId && amountValid && pinValid && !pinRequired && !pinLocked && !submitting)

  const handleSubmit = async () => {
    if (!canSubmit || !userId || !selectedId) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await payoutToSavedAccount(userId, {
      savedBankAccountId: selectedId,
      amount: amountNum,
      currency,
      narration: narration.trim() || "Withdrawal",
      pin,
    })

    setSubmitting(false)

    if (result.error) {
      if (result.code === "TRANSACTION_PIN_REQUIRED") {
        setPinRequired(true)
        setSubmitError("Set up a transaction PIN before withdrawing.")
        return
      }
      if (result.code === "TRANSACTION_PIN_LOCKED") {
        setPinLocked(true)
        setLockedUntil(result.lockedUntil)
      }
      setSubmitError(
        result.attemptsRemaining != null
          ? `${result.error} (${result.attemptsRemaining} attempts remaining)`
          : result.error,
      )
      return
    }

    setSuccess(true)
    void refetchWallet()
  }

  if (success) {
    return (
      <MobileFlowShell title="Withdraw">
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-4 text-lg font-semibold text-[#111827]">Withdrawal submitted</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            {formatWalletBalance(amountNum, currency)} is being sent to your bank account.
          </p>
          <button
            type="button"
            onClick={() => router.push("/mobile-v2/home")}
            className="mt-8 h-12 w-full rounded-xl bg-[#111827] text-sm font-semibold text-white"
          >
            Back to home
          </button>
        </div>
      </MobileFlowShell>
    )
  }

  return (
    <MobileFlowShell title="Withdraw">
      <p className="text-sm text-[#6B7280]">
        Withdraw from your primary wallet to a saved bank account in your name.
      </p>

      <div className="mt-4 rounded-2xl bg-[#F4F6FF] px-4 py-3">
        <p className="text-xs text-[#6B7280]">Available balance (central wallet)</p>
        <p className="text-lg font-bold text-[#111827]">
          {walletLoading ? "…" : formattedBalance}
        </p>
      </div>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#E5E7EB] px-4 py-8 text-center">
          <p className="text-sm font-semibold text-[#111827]">No saved bank accounts</p>
          <p className="mt-1 text-xs text-[#6B7280]">Add a bank account before withdrawing.</p>
          <Link
            href="/mobile-v2/bank-accounts/add"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#111827] px-6 text-sm font-semibold text-white"
          >
            Add bank account
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#111827]">Destination account</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                  {a.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827]">Amount ({currency})</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0.00"
              inputMode="decimal"
              className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
            />
            {amountNum > balance ? (
              <p className="mt-1 text-xs text-red-600">Amount exceeds available balance.</p>
            ) : null}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827]">Description (optional)</label>
            <input
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827]"
            />
          </div>

          {pinRequired ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You need a transaction PIN to withdraw.{" "}
              <Link href="/mobile-v2/transaction-pin" className="font-semibold underline">
                Create PIN
              </Link>
            </div>
          ) : pinLocked ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Transaction PIN is locked
              {lockedUntil ? ` until ${new Date(lockedUntil).toLocaleString()}` : ""}.
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#111827]">Transaction PIN</label>
              <div className="mt-3">
                <PinInput value={pin} onChange={setPin} autoFocus={false} />
              </div>
              <p className="mt-2 text-center text-xs text-[#6B7280]">
                <Link href="/mobile-v2/transaction-pin" className="text-[#4F46E5] underline">
                  Change PIN
                </Link>
              </p>
            </div>
          )}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className={`h-12 w-full rounded-xl text-sm font-semibold ${
              canSubmit ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Processing…" : "Withdraw"}
          </button>
        </div>
      )}
    </MobileFlowShell>
  )
}
