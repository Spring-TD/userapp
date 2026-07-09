"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Star, Trash2 } from "lucide-react"

import { MobileFlowShell } from "@/components/mobile-v2/MobileFlowShell"
import { useAuthUserProfile } from "@/hooks/useAuthUserProfile"
import { useUserWallet } from "@/hooks/useUserWallet"
import {
  fetchExternalBankAccounts,
  removeExternalBankAccount,
  setDefaultExternalBankAccount,
} from "@/lib/services/externalBankAccountApi"
import type { SavedExternalBankAccount } from "@/types/externalBankAccount"

const MAX_ACCOUNTS = 5

function accountLabel(a: SavedExternalBankAccount): string {
  return a.label?.trim() || a.accountName
}

export default function BankAccountsPage() {
  const router = useRouter()
  const { wallet } = useUserWallet()
  const { kycApproved } = useAuthUserProfile()
  const userId = wallet?.userId ?? null

  const [accounts, setAccounts] = useState<SavedExternalBankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await fetchExternalBankAccounts(userId)
    setAccounts(result.accounts.filter((a) => a.status !== "deleted"))
    setError(result.error)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when userId changes
  }, [userId])

  const canAdd = useMemo(() => accounts.length < MAX_ACCOUNTS, [accounts.length])

  const handleRemove = async (accountId: string) => {
    if (!userId || busyId) return
    if (!window.confirm("Remove this bank account?")) return
    setBusyId(accountId)
    const result = await removeExternalBankAccount(userId, accountId)
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }
    void load()
  }

  const handleSetDefault = async (accountId: string) => {
    if (!userId || busyId) return
    setBusyId(accountId)
    const result = await setDefaultExternalBankAccount(userId, accountId)
    setBusyId(null)
    if (result.error) {
      setError(result.error)
      return
    }
    void load()
  }

  return (
    <MobileFlowShell title="Bank accounts">
      <p className="text-sm text-[#6B7280]">
        Save your own bank accounts to withdraw from your primary wallet. Accounts must match your verified identity.
      </p>

      {!kycApproved ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete identity verification before adding a bank account.{" "}
          <Link href="/mobile-v2/profile/kyc/create" className="font-semibold underline">
            Verify now
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <button
        type="button"
        disabled={!kycApproved || !canAdd || !userId}
        onClick={() => router.push("/mobile-v2/bank-accounts/add")}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#EEF0F6] bg-[#F4F6FF] text-sm font-semibold text-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add bank account
      </button>

      {!canAdd ? (
        <p className="mt-2 text-center text-xs text-[#6B7280]">Maximum {MAX_ACCOUNTS} saved accounts.</p>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-semibold text-[#111827]">Saved accounts</p>

        {loading ? (
          <div className="mt-4 flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-[#E5E7EB] px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[#111827]">No bank accounts yet</p>
            <p className="mt-1 text-xs text-[#6B7280]">Add an account in your name to withdraw funds.</p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-[#EEF0F6] rounded-2xl border border-[#EEF0F6] bg-white">
            {accounts.map((a) => (
              <div key={a.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[#111827]">{accountLabel(a)}</p>
                      {a.isDefault ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#4F46E5]">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      {a.bankName} · {a.accountNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">{a.accountName}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {!a.isDefault ? (
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => void handleSetDefault(a.id)}
                        className="text-xs font-semibold text-[#4F46E5]"
                      >
                        Set default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === a.id}
                      onClick={() => void handleRemove(a.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"
                    >
                      {busyId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {accounts.length > 0 ? (
        <button
          type="button"
          onClick={() => router.push("/mobile-v2/withdraw")}
          className="mt-6 h-12 w-full rounded-xl bg-[#111827] text-sm font-semibold text-white"
        >
          Withdraw to bank
        </button>
      ) : null}
    </MobileFlowShell>
  )
}
