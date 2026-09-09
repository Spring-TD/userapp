"use client"

import { useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { resolveWalletUserIdCandidates } from "@/lib/resolveWalletUserId"
import { handleAuthFailure, hasValidAccessToken, isAuthFailureMessage, isAuthFailureStatus } from "@/lib/mobileV2AuthSession"
import { fetchUserWallet } from "@/lib/services/userWalletApi"
import {
  formatWalletBalance,
  readCachedRegistrationWallet,
  registrationWalletToUserWallet,
  walletSpendableBalance,
} from "@/lib/userWallet"
import type { RootState } from "@/store/store"
import type { UserWallet } from "@/types/userWallet"

export interface UseUserWalletReturn {
  wallet: UserWallet | null
  balance: number
  formattedBalance: string
  currency: string
  loading: boolean
  error: string | null
  notFound: boolean
  refetch: () => Promise<void>
}

/**
 * Loads the logged-in user's wallet via `GET /api/v1/wallets/user/{userId}` (BFF).
 * Resolves `userId` from profile/login (not JWT `sub` alone).
 */
export function useUserWallet(explicitUserId?: string | null): UseUserWalletReturn {
  const authUserId = useSelector((s: RootState) => s.auth.user?.id)
  const hintUserId = explicitUserId ?? authUserId ?? null

  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    const userIds = await resolveWalletUserIdCandidates(hintUserId)
    const primaryUserId = userIds[0]
    if (!primaryUserId) {
      setLoading(false)
      setWallet(null)
      if (!hasValidAccessToken()) {
        void handleAuthFailure()
      } else {
        setError("Not authenticated")
      }
      return
    }

    const cached = readCachedRegistrationWallet()
    const cachedWallet = cached ? registrationWalletToUserWallet(cached, primaryUserId) : null

    try {
      let fetchError: string | null = null
      let status = 0

      for (const userId of userIds) {
        const result = await fetchUserWallet(userId, { force })
        fetchError = result.error
        status = result.status

        if (result.wallet) {
          setWallet(result.wallet)
          if (userId !== primaryUserId) {
            console.info("[useUserWallet] resolved wallet with alternate user id", { primaryUserId, userId })
          }
          return
        }

        if (result.status !== 404 && result.status !== 403) break
      }

      if (fetchError) {
        if (isAuthFailureStatus(status) || isAuthFailureMessage(fetchError)) {
          setWallet(null)
          void handleAuthFailure()
          return
        }
        if (status === 404) {
          if (cachedWallet) {
            setWallet(cachedWallet)
            setNotFound(false)
            setError(null)
          } else {
            setNotFound(true)
            setError("User wallet not found")
            setWallet(null)
          }
        } else {
          setError(fetchError)
          setWallet(cachedWallet)
        }
        return
      }

      if (cachedWallet) {
        setWallet(cachedWallet)
        return
      }

      setNotFound(true)
      setError("Wallet data was empty")
    } catch (err) {
      console.warn("[useUserWallet] fetch failed:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch wallet")
      if (cachedWallet) setWallet(cachedWallet)
    } finally {
      setLoading(false)
    }
  }, [hintUserId])

  useEffect(() => {
    void load()
  }, [load])

  const balance = walletSpendableBalance(wallet)
  const currency = wallet?.currency || "NGN"

  return {
    wallet,
    balance,
    formattedBalance: formatWalletBalance(balance, currency),
    currency,
    loading,
    error,
    notFound,
    refetch: () => load(true),
  }
}

/** @deprecated Use `useUserWallet` */
export function useWalletBalance(): UseUserWalletReturn {
  return useUserWallet()
}
