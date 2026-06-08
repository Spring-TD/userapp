import { AUTH_USER_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"
import type { RegisterUserWallet } from "@/types/mobileClientAuth"
import type { UserWallet, UserWalletApiResponse, VirtualNuban } from "@/types/userWallet"

export const REGISTRATION_WALLET_STORAGE_KEY = "mobile-v2-registration-wallet"

function isWalletShape(value: unknown): value is UserWallet {
  if (!value || typeof value !== "object") return false
  const w = value as UserWallet
  return Boolean(w.id && (typeof w.mainBalance === "number" || typeof w.balance === "number"))
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (value != null && (typeof value === "number" || typeof value === "bigint")) return String(value)
  }
  return undefined
}

function normalizeVirtualNuban(wallet: UserWallet): UserWallet {
  const raw = wallet as UserWallet & Record<string, unknown>
  const existing = wallet.virtualNuban || {}
  const accountNumber =
    existing.accountNumber ||
    pickString(
      raw,
      "accountNumber",
      "account_number",
      "nuban",
      "nubanAccountNumber",
      "payonusNubanAccountNumber",
      "payonus_account_number",
    )
  const bankName =
    existing.bankName ||
    pickString(raw, "bankName", "bank_name", "nubanBankName", "payonusNubanBankName", "payonus_bank_name")
  const bankCode =
    existing.bankCode ||
    pickString(raw, "bankCode", "bank_code", "nubanBankCode", "payonusNubanBankCode", "payonus_bank_code")
  const providerReference =
    existing.providerReference ||
    pickString(raw, "providerReference", "provider_reference", "payonusNubanProviderReference")
  const provisionStatus =
    existing.provisionStatus ||
    pickString(raw, "provisionStatus", "provision_status", "payonusNubanProvisionStatus") ||
    (accountNumber ? "active" : undefined)
  const provisionedAt =
    existing.provisionedAt ||
    pickString(raw, "provisionedAt", "provisioned_at", "payonusNubanProvisionedAt")
  const provisionError =
    existing.provisionError ||
    pickString(raw, "provisionError", "provision_error", "payonusNubanProvisionError")

  const virtualNuban: VirtualNuban | undefined = accountNumber
    ? {
        ...existing,
        accountNumber,
        bankName,
        bankCode,
        providerReference,
        provisionStatus,
        provisionedAt,
        provisionError,
      }
    : wallet.virtualNuban

  return virtualNuban ? { ...wallet, virtualNuban } : wallet
}

export function parseUserWalletFromResponse(payload: UserWalletApiResponse | null | undefined): UserWallet | null {
  if (!payload || typeof payload !== "object") return null
  const nested = payload.data?.wallet
  if (isWalletShape(nested)) return normalizeVirtualNuban(nested)
  if (isWalletShape(payload.wallet)) return normalizeVirtualNuban(payload.wallet)
  const data = payload.data
  if (isWalletShape(data)) return normalizeVirtualNuban(data)
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
  const status = String(nuban.provisionStatus || "").trim().toLowerCase()
  return Boolean(nuban.accountNumber) && (!status || status === "active" || status === "provisioned" || status === "success")
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
