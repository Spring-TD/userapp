import { AUTH_USER_ID_STORAGE_KEY } from "@/lib/mobileTenant/storageKeys"
import type { RegisterUserWallet } from "@/types/mobileClientAuth"
import type { UserWallet, UserWalletApiResponse, VirtualNuban, WalletTransaction } from "@/types/userWallet"

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function pickStringLoose(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  const normalizedKeys = new Set(keys.map(normalizeLookupKey))

  for (const [key, value] of Object.entries(obj)) {
    if (!normalizedKeys.has(normalizeLookupKey(key))) continue
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

function titleCaseWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function walletTransactionChannel(transaction: WalletTransaction): string | undefined {
  const channel = transaction.metadata?.parsedPayload?.paymentChannel
  return typeof channel === "string" && channel.trim() ? channel.trim() : undefined
}

function walletTransactionParticipant(transaction: WalletTransaction): string | undefined {
  const meta = (transaction.metadata || {}) as Record<string, unknown>
  const parsedPayload = (transaction.metadata?.parsedPayload || {}) as Record<string, unknown>
  const decodedRawPayload = (meta.decodedRawPayload || {}) as Record<string, unknown>
  const payonus = (meta.payonus || {}) as Record<string, unknown>
  const parties = (meta.parties || {}) as Record<string, unknown>
  const payment = (meta.payment || {}) as Record<string, unknown>

  const participantNameKeys = [
    "senderName",
    "sender_name",
    "senderAccountName",
    "sender_account_name",
    "customerName",
    "customer_name",
    "payerName",
    "payer_name",
    "accountName",
    "account_name",
    "sourceAccountName",
    "source_account_name",
    "originatorName",
    "originator_name",
    "originatorAccountName",
    "originator_account_name",
    "sender",
    "payer",
    "customer",
    "originator",
    "name",
    "fullName",
    "full_name",
  ]
  const participantContainerKeys = [
    "sender",
    "payer",
    "customer",
    "originator",
    "source",
    "from",
    "debitAccount",
    "debit_account",
    "sourceAccount",
    "source_account",
    "senderDetails",
    "sender_details",
    "payerDetails",
    "payer_details",
    "customerDetails",
    "customer_details",
    "originatorDetails",
    "originator_details",
  ]

  const pickParticipant = (value: unknown): string | undefined => {
    if (!isRecord(value)) return undefined

    const direct = pickStringLoose(value, ...participantNameKeys)
    if (direct) return direct

    const normalizedContainerKeys = new Set(participantContainerKeys.map(normalizeLookupKey))
    for (const [key, nested] of Object.entries(value)) {
      if (!normalizedContainerKeys.has(normalizeLookupKey(key))) continue
      if (isRecord(nested)) {
        const nestedName = pickStringLoose(nested, ...participantNameKeys)
        if (nestedName) return nestedName
      }
    }

    return undefined
  }

  return (
    pickParticipant(transaction) ||
    pickParticipant(meta) ||
    pickParticipant(parsedPayload) ||
    pickParticipant(parties) ||
    pickParticipant(payonus) ||
    pickParticipant(payment) ||
    pickParticipant(decodedRawPayload)
  )
}

/** Small label above each transaction title, e.g. Transfer or Card. */
export function walletTransactionMethodLabel(transaction: WalletTransaction): string {
  const channel = String(walletTransactionChannel(transaction) || "").toUpperCase()
  const tags = Array.isArray(transaction.tags) ? transaction.tags.map((tag) => tag.toLowerCase()) : []

  if (channel.includes("CARD") || tags.includes("card")) return "Card"
  if (channel === "BANK_TRANSFER" || channel.includes("TRANSFER") || tags.includes("funding")) return "Transfer"
  return transaction.type === "DEBIT" ? "Transfer" : "Receive"
}

/** Main transaction row title. Prefer the sender/customer name when the API provides it. */
export function walletTransactionTitle(transaction: WalletTransaction): string {
  const category = String(transaction.category || "").trim().toUpperCase()
  const tags = Array.isArray(transaction.tags) ? transaction.tags.map((tag) => tag.toLowerCase()) : []
  const participant = walletTransactionParticipant(transaction)

  if (participant) return titleCaseWords(participant)

  if (category === "FUNDING" || tags.includes("funding")) {
    return transaction.type === "CREDIT" ? "Unknown sender" : "Unknown recipient"
  }

  const raw = (transaction.description || transaction.referenceId || transaction.externalReference || "").trim()
  if (raw) {
    const cleaned = raw
      .replace(/\([^)]*\)/g, " ")
      .replace(/[_-]/g, " ")
      .replace(/\b(credit|debit|wallet|transaction|transfer|funding|collection|successful)\b/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+/g, " ")
      .trim()

    if (cleaned) return titleCaseWords(cleaned)
  }

  const provider = String(transaction.source || transaction.metadata?.provider || "").toLowerCase()
  if (provider === "payonus") return transaction.type === "CREDIT" ? "Unknown sender" : "Unknown recipient"

  return transaction.type === "CREDIT" ? "Wallet funding" : "Wallet transfer"
}

export function walletTransactionSummary(transaction: WalletTransaction): string {
  const title = walletTransactionTitle(transaction)
  const amount = formatWalletBalance(Math.abs(transaction.amount))
  return transaction.type === "CREDIT"
    ? `${amount} credit from ${title}`
    : `${amount} debit to ${title}`
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
