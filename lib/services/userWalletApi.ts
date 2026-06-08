/**
 * Retail user wallet — same-origin BFF (`/api/v1/wallets/user/{userId}`).
 * Avoids browser CORS to account-ms; forwards Bearer from cookies.
 */

import { ENDPOINTS } from "@/lib/endpoints"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import { parseUserWalletFromResponse } from "@/lib/userWallet"
import type {
  UserProductTypeSummary,
  UserProductTypeSummaryResponse,
  UserWallet,
  UserWalletApiResponse,
  UserWalletTransactionsResponse,
  WalletTransaction,
} from "@/types/userWallet"

const BFF = "/api"

function bffUrl(path: string): string {
  return `${BFF}${path.startsWith("/") ? path : `/${path}`}`
}

export async function fetchUserWallet(userId: string): Promise<{
  wallet: UserWallet | null
  error: string | null
  status: number
}> {
  const url = bffUrl(ENDPOINTS.wallet.userById(userId))
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as UserWalletApiResponse

  if (!res.ok) {
    return {
      wallet: null,
      error: data.error || `Failed to load wallet (${res.status})`,
      status: res.status,
    }
  }

  return {
    wallet: parseUserWalletFromResponse(data),
    error: null,
    status: res.status,
  }
}

export async function fetchUserProductTypeSummary(userId: string): Promise<{
  summary: UserProductTypeSummary | null
  error: string | null
  status: number
}> {
  const url = bffUrl(ENDPOINTS.wallet.userProductTypeSummary(userId))
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as UserProductTypeSummaryResponse

  if (!res.ok) {
    return {
      summary: null,
      error: data.error || data.message || `Failed to load account summary (${res.status})`,
      status: res.status,
    }
  }

  return {
    summary: data.data ?? null,
    error: null,
    status: res.status,
  }
}

export async function fetchUserWalletTransactions(
  userId: string,
  params?: {
    page?: number
    limit?: number
    type?: "CREDIT" | "DEBIT"
    status?: string
    startDate?: string
    endDate?: string
  },
): Promise<{ transactions: WalletTransaction[]; error: string | null; status: number }> {
  const qs = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v))
    }
  }
  const base = ENDPOINTS.wallet.userTransactions(userId)
  const url = bffUrl(qs.toString() ? `${base}?${qs}` : base)
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = (await res.json().catch(() => ({}))) as UserWalletTransactionsResponse

  if (!res.ok) {
    return {
      transactions: [],
      error: data.error || `Failed to load transactions (${res.status})`,
      status: res.status,
    }
  }

  const raw = data.data
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "transactions" in raw
      ? (raw as { transactions?: WalletTransaction[] }).transactions
      : []

  return {
    transactions: Array.isArray(list) ? list : [],
    error: null,
    status: res.status,
  }
}
