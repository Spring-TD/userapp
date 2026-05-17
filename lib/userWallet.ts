import { AUTH_USER_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"
import type { RegisterUserWallet } from "@/types/mobileClientAuth"
import type { UserWallet, UserWalletApiResponse } from "@/types/userWallet"

export const REGISTRATION_WALLET_STORAGE_KEY = "mobile-v2-registration-wallet"

function isWalletShape(value: unknown): value is UserWallet {
  if (!value || typeof value !== "object") return false
  const w = value as UserWallet
  return Boolean(w.id && (typeof w.mainBalance === "number" || typeof w.balance === "number"))
}

export function parseUserWalletFromResponse(payload: UserWalletApiResponse | null | undefined): UserWallet | null {
  if (!payload || typeof payload !== "object") return null
  const nested = payload.data?.wallet
  if (isWalletShape(nested)) return nested
  if (isWalletShape(payload.wallet)) return payload.wallet
  const data = payload.data
  if (isWalletShape(data)) return data
  if (payload.success === false) return null
  return null
}

export function cacheAuthUserId(userId: string) {
  if (typeof window === "undefined" || !userId.trim()) return
  try {
    sessionStorage.setItem(AUTH_USER_ID_STORAGE_KEY, userId.trim())
  } catch {
    /* ignore */
  }
}

export function readCachedAuthUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const id = sessionStorage.getItem(AUTH_USER_ID_STORAGE_KEY)?.trim()
    return id || null
  } catch {
    return null
  }
}

export function walletSpendableBalance(wallet: UserWallet | null | undefined): number {
  if (!wallet) return 0
  if (typeof wallet.mainBalance === "number") return wallet.mainBalance
  if (typeof wallet.balance === "number") return wallet.balance
  return 0
}

export function formatWalletBalance(amount: number, currency = "NGN"): string {
  if (currency === "NGN") {
    return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function maskAccountNumber(accountNumber?: string): string {
  if (!accountNumber || accountNumber.length < 4) return "****"
  return `****${accountNumber.slice(-4)}`
}

export function isVirtualNubanActive(wallet: UserWallet | null | undefined): boolean {
  const nuban = wallet?.virtualNuban
  if (!nuban) return false
  return nuban.provisionStatus === "active" && Boolean(nuban.accountNumber)
}

export function cacheRegistrationWallet(wallet: RegisterUserWallet | undefined) {
  if (typeof window === "undefined" || !wallet) return
  try {
    sessionStorage.setItem(REGISTRATION_WALLET_STORAGE_KEY, JSON.stringify(wallet))
  } catch {
    /* ignore */
  }
}

export function readCachedRegistrationWallet(): RegisterUserWallet | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(REGISTRATION_WALLET_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as RegisterUserWallet
  } catch {
    return null
  }
}

export function registrationWalletToUserWallet(
  cached: RegisterUserWallet,
  userId: string,
): UserWallet | null {
  if (!cached.id) return null
  return {
    id: cached.id,
    userId: cached.userId || userId,
    merchantId: cached.merchantId,
    mainBalance: 0,
    ledgerBalance: 0,
    balance: 0,
    currency: cached.currency || "NGN",
    status: "ACTIVE",
    virtualNuban: cached.virtualNuban,
  }
}
