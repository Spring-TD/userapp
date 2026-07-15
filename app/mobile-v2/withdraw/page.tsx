'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Download, Mail } from 'lucide-react'

import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { PinInput } from '@/components/mobile-v2/transaction-pin/PinInput'
import { TransactionReceiptSheet } from '@/components/mobile-v2/transactions/TransactionReceiptSheet'
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile'
import { useUserWallet } from '@/hooks/useUserWallet'
import {
  fetchExternalBankAccounts,
  fetchTransactionPinStatus,
  payoutToSavedAccount,
} from '@/lib/services/externalBankAccountApi'
import { downloadReceipt, emailReceipt, withdrawalToReceipt } from '@/lib/transactionReceipt'
import { formatWalletBalance, walletSpendableBalance } from '@/lib/userWallet'
import type { SavedExternalBankAccount } from '@/types/externalBankAccount'
import type { TransactionReceiptData } from '@/lib/transactionReceipt'

function accountLabel(a: SavedExternalBankAccount): string {
  return a.label?.trim() || `${a.bankName} · ${a.accountNumber}`
}

export default function WithdrawPage() {
  const router = useRouter()
  const { user: profile } = useAuthUserProfile()
  const { wallet, formattedBalance, loading: walletLoading, refetch: refetchWallet } = useUserWallet()
  const userId = wallet?.userId ?? null
  const balance = walletSpendableBalance(wallet)
  const currency = wallet?.currency || 'NGN'

  const [accounts, setAccounts] = useState<SavedExternalBankAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [narration, setNarration] = useState('Withdrawal')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pinRequired, setPinRequired] = useState(false)
  const [pinLocked, setPinLocked] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<TransactionReceiptData | null>(null)
  const [showReceiptSheet, setShowReceiptSheet] = useState(false)

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedId) ?? null,
    [accounts, selectedId],
  )

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

      const active = accountsResult.accounts.filter((a) => a.status !== 'deleted')
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
    const n = Number(amount.replace(/,/g, ''))
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const amountValid = amountNum > 0 && amountNum <= balance
  const pinValid = pin.length === 4
  const canSubmit = Boolean(userId && selectedId && amountValid && pinValid && !pinRequired && !pinLocked && !submitting)

  const handleSubmit = async () => {
    if (!canSubmit || !userId || !selectedId || !selectedAccount) return
    setSubmitting(true)
    setSubmitError(null)

    const result = await payoutToSavedAccount(userId, {
      savedBankAccountId: selectedId,
      amount: amountNum,
      currency,
      narration: narration.trim() || 'Withdrawal',
      pin,
    })

    setSubmitting(false)

    if (result.error) {
      if (result.code === 'TRANSACTION_PIN_REQUIRED') {
        setPinRequired(true)
        setSubmitError('Set up a transaction PIN before withdrawing.')
        return
      }
      if (result.code === 'TRANSACTION_PIN_LOCKED') {
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

    const payoutData = result.data
    const transactionId =
      typeof payoutData?.transaction === 'object' && payoutData.transaction && 'id' in (payoutData.transaction as object)
        ? String((payoutData.transaction as { id?: string }).id || '')
        : undefined

    const nextReceipt = withdrawalToReceipt({
      amount: amountNum,
      currency,
      status: payoutData?.providerStatus || 'COMPLETED',
      reference: payoutData?.payoutReference,
      externalReference: payoutData?.providerReference,
      narration: narration.trim() || 'Withdrawal',
      accountHolder: wallet?.name || profile?.first_name,
      destinationAccount: selectedAccount.accountNumber,
      destinationBank: selectedAccount.bankName,
      destinationName: selectedAccount.accountName,
      transactionId,
    })

    setReceipt(nextReceipt)
    void refetchWallet()
  }

  if (receipt) {
    return (
      <MobileFlowShell title="Withdraw">
        <div className="py-6 text-center">
          <h2 className="text-lg font-semibold text-[#111827]">Withdrawal submitted</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            {formatWalletBalance(receipt.amount, receipt.currency)} is being sent to your bank account.
          </p>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            A confirmation receipt is ready. You can download it or email it to yourself.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => downloadReceipt(receipt)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" />
              Download receipt
            </button>
            <button
              type="button"
              disabled={!profile?.email}
              onClick={() => profile?.email && emailReceipt(receipt, profile.email)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 text-sm font-semibold text-[#111827] disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              Email receipt
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowReceiptSheet(true)}
            className="mt-3 w-full text-sm font-semibold text-[#4F46E5]"
          >
            View receipt details
          </button>

          <button
            type="button"
            onClick={() => router.push('/mobile-v2/home')}
            className="mt-8 h-12 w-full rounded-xl bg-[#111827] text-sm font-semibold text-white"
          >
            Back to home
          </button>
        </div>

        {showReceiptSheet ? (
          <TransactionReceiptSheet
            receipt={receipt}
            userEmail={profile?.email}
            onClose={() => setShowReceiptSheet(false)}
          />
        ) : null}
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
        <p className="text-lg font-bold text-[#111827]">{walletLoading ? '…' : formattedBalance}</p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-[#6B7280]">Loading accounts…</p>
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
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#111827]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                  {a.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
            <Link href="/mobile-v2/bank-accounts/add" className="mt-2 inline-block text-xs font-semibold text-[#4F46E5]">
              Add another beneficiary account
            </Link>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#111827]">Amount ({currency})</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
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
              You need a transaction PIN to withdraw.{' '}
              <Link href="/mobile-v2/transaction-pin" className="font-semibold underline">
                Create PIN
              </Link>
            </div>
          ) : pinLocked ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Transaction PIN is locked
              {lockedUntil ? ` until ${new Date(lockedUntil).toLocaleString()}` : ''}.
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-[#111827]">Transaction PIN</label>
              <div className="mt-3">
                <PinInput value={pin} onChange={setPin} autoFocus={false} />
              </div>
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
              canSubmit ? 'bg-[#111827] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'
            }`}
          >
            {submitting ? 'Processing…' : 'Withdraw'}
          </button>
        </div>
      )}
    </MobileFlowShell>
  )
}
