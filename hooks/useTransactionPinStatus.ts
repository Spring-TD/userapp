"use client"

import { useCallback, useEffect, useState } from "react"

import { useAuthUserProfile } from "@/hooks/useAuthUserProfile"
import { resolveWalletUserId } from "@/lib/resolveWalletUserId"
import { fetchTransactionPinStatus } from "@/lib/services/externalBankAccountApi"
import type { TransactionPinStatus } from "@/types/externalBankAccount"

export function useTransactionPinStatus(explicitUserId?: string | null) {
  const { user } = useAuthUserProfile()
  const hintUserId = explicitUserId ?? user?.id ?? null

  const [status, setStatus] = useState<TransactionPinStatus | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const resolvedUserId = await resolveWalletUserId(hintUserId)
    setUserId(resolvedUserId)

    if (!resolvedUserId) {
      setStatus(null)
      setLoading(false)
      return null
    }

    const result = await fetchTransactionPinStatus(resolvedUserId)
    setStatus(result.status)
    setError(result.error)
    setLoading(false)
    return result.status
  }, [hintUserId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return {
    userId,
    status,
    loading,
    error,
    hasPin: Boolean(status?.hasTransactionPin),
    locked: Boolean(status?.locked),
    lockedUntil: status?.lockedUntil ?? null,
    refetch,
  }
}
