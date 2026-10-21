"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"

import { MobileFlowShell } from "@/components/mobile-v2/MobileFlowShell"
import { PinInput } from "@/components/mobile-v2/transaction-pin/PinInput"
import { useTransactionPinStatus } from "@/hooks/useTransactionPinStatus"
import {
  createTransactionPin,
  updateTransactionPin,
} from "@/lib/services/externalBankAccountApi"
import {
  DEFAULT_MOBILE_HOME,
  safeMobileReturnPath,
} from "@/lib/userKycRouting"

function TransactionPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setupMode = searchParams.get("setup") === "1"
  const returnTo = safeMobileReturnPath(
    searchParams.get("returnTo"),
    DEFAULT_MOBILE_HOME,
  )

  const { userId, hasPin, locked, lockedUntil, loading, refetch } = useTransactionPinStatus()

  /** Locked on first load so a successful create does not flip the UI to "change PIN". */
  const [formMode, setFormMode] = useState<"create" | "change" | null>(null)

  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successWasCreate, setSuccessWasCreate] = useState(false)

  useEffect(() => {
    if (loading) return
    if (setupMode && hasPin) {
      router.replace(returnTo)
      return
    }
    if (formMode !== null) return
    setFormMode(hasPin ? "change" : "create")
  }, [loading, hasPin, formMode, setupMode, returnTo, router])

  const pinsMatch = newPin.length === 4 && newPin === confirmPin
  const canCreate = formMode === "create" && pinsMatch && !locked && Boolean(userId)
  const canUpdate = formMode === "change" && currentPin.length === 4 && pinsMatch && !locked && Boolean(userId)

  const finishSetup = () => {
    if (setupMode) {
      router.replace(returnTo)
      return
    }
    router.back()
  }

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
    setSuccessWasCreate(true)
    setSuccess(true)
    setNewPin("")
    setConfirmPin("")
    if (setupMode) {
      router.replace(returnTo)
      return
    }
    void refetch()
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
    setSuccessWasCreate(false)
    setSuccess(true)
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
    void refetch()
  }

  const title =
    setupMode && formMode === "create" ? "Create transaction PIN" : "Transaction PIN"

  return (
    <MobileFlowShell title={title}>
      {setupMode && formMode === "create" && !success ? (
        <div className="mb-4 rounded-xl border border-[var(--sf-primary,#2563EB)]/20 bg-[var(--sf-primary,#2563EB)]/5 px-4 py-3 text-sm leading-relaxed text-[#1E293B]">
          Secure your wallet with a 4-digit PIN. You&apos;ll need it when withdrawing to your bank
          account or sending money out.
        </div>
      ) : (
        <p className="text-sm text-[#6B7280]">
          Your 4-digit PIN is required when withdrawing to your bank account or transferring funds
          out of your wallet.
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      ) : !userId ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sign in to manage your transaction PIN.
        </div>
      ) : locked ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          PIN is temporarily locked
          {lockedUntil ? ` until ${new Date(lockedUntil).toLocaleString()}` : ""}.
        </div>
      ) : success ? (
        <div className="mt-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-3 text-sm font-semibold text-[#111827]">
            {successWasCreate ? "PIN created successfully" : "PIN updated successfully"}
          </p>
          <button
            type="button"
            onClick={finishSetup}
            className="sf-btn mt-6 h-12 w-full rounded-xl text-sm font-semibold"
          >
            Done
          </button>
        </div>
      ) : formMode === "change" ? (
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!canUpdate || submitting}
            onClick={() => void handleUpdate()}
            className={`h-12 w-full rounded-xl text-sm font-semibold ${
              canUpdate && !submitting ? "bg-[#111827] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Saving…" : "Change PIN"}
          </button>
        </div>
      ) : formMode === "create" ? (
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            disabled={!canCreate || submitting}
            onClick={() => void handleCreate()}
            className={`h-12 w-full rounded-xl text-sm font-semibold ${
              canCreate && !submitting ? "sf-btn" : "bg-[#E5E7EB] text-[#9CA3AF]"
            }`}
          >
            {submitting ? "Saving…" : "Create PIN"}
          </button>
          {setupMode ? (
            <Link
              href={returnTo}
              className="block text-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Link>
          ) : null}
        </div>
      ) : null}
    </MobileFlowShell>
  )
}

export default function TransactionPinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center sf-page-bg text-sm text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <TransactionPinContent />
    </Suspense>
  )
}
