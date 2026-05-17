"use client"

import { useCallback, useEffect, useState } from "react"
import { useSelector } from "react-redux"

import { resolveWalletUserId } from "@/lib/resolveWalletUserId"
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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotFound(false)

    const userId = await resolveWalletUserId(hintUserId)
    if (!userId) {
      setLoading(false)
      setError("Not authenticated")
      setWallet(null)
      return
    }

    const cached = readCachedRegistrationWallet()
    const cachedWallet = cached ? registrationWalletToUserWallet(cached, userId) : null

    try {
      const { wallet: fetched, error: fetchError, status } = await fetchUserWallet(userId)

      if (fetchError) {
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
          if (cachedWallet) setWallet(cachedWallet)
        }
        return
      }

      if (fetched) {
        setWallet(fetched)
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
    refetch: load,
  }
}

/** @deprecated Use `useUserWallet` */
export function useWalletBalance(): UseUserWalletReturn {
  return useUserWallet()
}
