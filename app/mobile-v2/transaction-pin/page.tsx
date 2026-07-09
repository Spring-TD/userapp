"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { MobileFlowShell } from "@/components/mobile-v2/MobileFlowShell"
import { PinInput } from "@/components/mobile-v2/transaction-pin/PinInput"
import { useUserWallet } from "@/hooks/useUserWallet"
import {
  createTransactionPin,
  fetchTransactionPinStatus,
  updateTransactionPin,
} from "@/lib/services/externalBankAccountApi"

export default function TransactionPinPage() {
  const { wallet } = useUserWallet()
  const userId = wallet?.userId ?? null

  const [loading, setLoading] = useState(true)
  const [hasPin, setHasPin] = useState(false)
  const [locked, setLocked] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)

  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    void fetchTransactionPinStatus(userId).then((result) => {
      if (result.status) {
        setHasPin(result.status.hasTransactionPin)
        setLocked(result.status.locked)
        setLockedUntil(result.status.lockedUntil)
      }
      setError(result.error)
      setLoading(false)
    })
  }, [userId])

  const pinsMatch = newPin.length === 4 && newPin === confirmPin
  const canCreate = !hasPin && pinsMatch && !locked && userId
  const canUpdate =
    hasPin && currentPin.length === 4 && pinsMatch && !locked && userId

  const handleCreate = async () => {
    if (!canCreate || !userId) return
    setSubmitting(true)
    setError(null)
    const result = await createTransactionPin(userId, newPin)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setHasPin(true)
    setSuccess(true)
    setNewPin("")
    setConfirmPin("")
  }

  const handleUpdate = async () => {
    if (!canUpdate || !userId) return
    setSubmitting(true)
    setError(null)
    const result = await updateTransactionPin(userId, currentPin, newPin)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
  }

  return (
    <MobileFlowShell title="Transaction PIN">
      <p className="text-sm text-[#6B7280]">
        Your 4-digit PIN is required when withdrawing to your bank account.
      </p>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      ) : locked ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          PIN is temporarily locked
          {lockedUntil ? ` until ${new Date(lockedUntil).toLocaleString()}` : ""}.
        </div>
      ) : success ? (
        <div className="mt-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-[#111827]">PIN saved successfully</p>
        </div>
      ) : hasPin ? (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#111827]">Current PIN</p>
            <div className="mt-3">
              <PinInput value={currentPin} onChange={setCurrentPin} idPrefix="current" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111827]">New PIN</p>
            <div className="mt-3">
              <PinInput value={newPin} onChange={setNewPin} idPrefix="new" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111827]">Confirm new PIN</p>
            <div className="mt-3">
              <PinInput value={confirmPin} onChange={setConfirmPin} idPrefix="confirm" />
            </div>
          </div>
          {newPin.length === 4 && confirmPin.length === 4 && !pinsMatch ? (
            <p className="text-xs text-red-600">PINs do not match.</p>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <button
            type="button"
            disabled={!canUpdate || submitting}
            onClick={() => void handleUpdate()}
            className={`h-12 w-full rounded-xl text-sm font-semibold ${
              canUpdate && !submitting ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Saving…" : "Update PIN"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#111827]">Create PIN</p>
            <div className="mt-3">
              <PinInput value={newPin} onChange={setNewPin} idPrefix="create" autoFocus />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111827]">Confirm PIN</p>
            <div className="mt-3">
              <PinInput value={confirmPin} onChange={setConfirmPin} idPrefix="create-confirm" />
            </div>
          </div>
          {newPin.length === 4 && confirmPin.length === 4 && !pinsMatch ? (
            <p className="text-xs text-red-600">PINs do not match.</p>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <button
            type="button"
            disabled={!canCreate || submitting}
            onClick={() => void handleCreate()}
            className={`h-12 w-full rounded-xl text-sm font-semibold ${
              canCreate && !submitting ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Saving…" : "Create PIN"}
          </button>
        </div>
      )}
    </MobileFlowShell>
  )
}
