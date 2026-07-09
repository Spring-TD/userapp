/**
 * External bank accounts, payout, and transaction PIN — same-origin BFF.
 */

import { ENDPOINTS } from "@/lib/endpoints"
import { fetchWithAuth } from "@/lib/fetchWithAuth"
import type {
  AddExternalBankAccountRequest,
  AddExternalBankAccountResponse,
  BanksListResponse,
  ExternalBankAccountsListResponse,
  NameEnquiryRequest,
  NameEnquiryResponse,
  PayoutRequest,
  PayoutResponse,
  SavedExternalBankAccount,
  TransactionPinStatus,
  TransactionPinStatusResponse,
} from "@/types/externalBankAccount"

const BFF = "/api"

function bffUrl(path: string): string {
  return `${BFF}${path.startsWith("/") ? path : `/${path}`}`
}

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json().catch(() => ({}))) as T
}

export async function fetchBanks(refresh = false): Promise<{
  banks: { code: string; name: string }[]
  error: string | null
  status: number
}> {
  const qs = refresh ? "?refresh=true" : ""
  const url = bffUrl(`${ENDPOINTS.wallet.banks}${qs}`)
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = await parseJson<BanksListResponse>(res)

  if (!res.ok) {
    return { banks: [], error: data.error || `Failed to load banks (${res.status})`, status: res.status }
  }

  return { banks: data.data ?? [], error: null, status: res.status }
}

export async function nameEnquiry(
  body: NameEnquiryRequest,
): Promise<{ result: NameEnquiryResponse["data"] | null; error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.nameEnquiry)
  const res = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({ ...body, currency: body.currency ?? "NGN" }),
  })
  const data = await parseJson<NameEnquiryResponse>(res)

  if (!res.ok) {
    return { result: null, error: data.error || `Name enquiry failed (${res.status})`, status: res.status }
  }

  return { result: data.data ?? null, error: null, status: res.status }
}

export async function fetchExternalBankAccounts(userId: string): Promise<{
  accounts: SavedExternalBankAccount[]
  error: string | null
  status: number
}> {
  const url = bffUrl(ENDPOINTS.wallet.externalBankAccounts(userId))
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = await parseJson<ExternalBankAccountsListResponse>(res)

  if (!res.ok) {
    return {
      accounts: [],
      error: data.error || `Failed to load bank accounts (${res.status})`,
      status: res.status,
    }
  }

  return { accounts: data.data?.accounts ?? [], error: null, status: res.status }
}

export async function addExternalBankAccount(
  userId: string,
  body: AddExternalBankAccountRequest,
): Promise<{ account: SavedExternalBankAccount | null; error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.externalBankAccounts(userId))
  const res = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({ ...body, currency: body.currency ?? "NGN" }),
  })
  const data = await parseJson<AddExternalBankAccountResponse>(res)

  if (!res.ok) {
    return {
      account: null,
      error: data.error || data.message || `Failed to save bank account (${res.status})`,
      status: res.status,
    }
  }

  return { account: data.data?.account ?? null, error: null, status: res.status }
}

export async function removeExternalBankAccount(
  userId: string,
  accountId: string,
): Promise<{ error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.externalBankAccountById(userId, accountId))
  const res = await fetchWithAuth(url, { method: "DELETE" })
  const data = await parseJson<{ success?: boolean; error?: string; message?: string }>(res)

  if (!res.ok) {
    return { error: data.error || data.message || `Failed to remove account (${res.status})`, status: res.status }
  }

  return { error: null, status: res.status }
}

export async function setDefaultExternalBankAccount(
  userId: string,
  accountId: string,
): Promise<{ account: SavedExternalBankAccount | null; error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.externalBankAccountDefault(userId, accountId))
  const res = await fetchWithAuth(url, { method: "PATCH" })
  const data = await parseJson<AddExternalBankAccountResponse>(res)

  if (!res.ok) {
    return {
      account: null,
      error: data.error || data.message || `Failed to update default (${res.status})`,
      status: res.status,
    }
  }

  return { account: data.data?.account ?? null, error: null, status: res.status }
}

export async function payoutToSavedAccount(
  userId: string,
  body: PayoutRequest,
): Promise<{
  data: PayoutResponse["data"] | null
  error: string | null
  code: string | null
  attemptsRemaining: number | null
  lockedUntil: string | null
  status: number
}> {
  const url = bffUrl(ENDPOINTS.wallet.payout(userId))
  const res = await fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) })
  const data = await parseJson<PayoutResponse>(res)

  if (!res.ok) {
    return {
      data: null,
      error: data.error || data.message || `Payout failed (${res.status})`,
      code: data.code ?? null,
      attemptsRemaining: data.attemptsRemaining ?? null,
      lockedUntil: data.lockedUntil ?? null,
      status: res.status,
    }
  }

  return {
    data: data.data ?? null,
    error: null,
    code: null,
    attemptsRemaining: null,
    lockedUntil: null,
    status: res.status,
  }
}

export async function fetchTransactionPinStatus(userId: string): Promise<{
  status: TransactionPinStatus | null
  error: string | null
  httpStatus: number
}> {
  const url = bffUrl(ENDPOINTS.wallet.transactionPinStatus(userId))
  const res = await fetchWithAuth(url, { method: "GET" })
  const data = await parseJson<TransactionPinStatusResponse>(res)

  if (!res.ok) {
    return {
      status: null,
      error: data.error || `Failed to load PIN status (${res.status})`,
      httpStatus: res.status,
    }
  }

  return { status: data.data ?? null, error: null, httpStatus: res.status }
}

export async function createTransactionPin(
  userId: string,
  pin: string,
): Promise<{ error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.transactionPin(userId))
  const res = await fetchWithAuth(url, { method: "POST", body: JSON.stringify({ pin }) })
  const data = await parseJson<{ error?: string; message?: string }>(res)

  if (!res.ok) {
    return { error: data.error || data.message || `Failed to create PIN (${res.status})`, status: res.status }
  }

  return { error: null, status: res.status }
}

export async function updateTransactionPin(
  userId: string,
  currentPin: string,
  newPin: string,
): Promise<{ error: string | null; status: number }> {
  const url = bffUrl(ENDPOINTS.wallet.transactionPin(userId))
  const res = await fetchWithAuth(url, {
    method: "PUT",
    body: JSON.stringify({ currentPin, newPin }),
  })
  const data = await parseJson<{ error?: string; message?: string }>(res)

  if (!res.ok) {
    return { error: data.error || data.message || `Failed to update PIN (${res.status})`, status: res.status }
  }

  return { error: null, status: res.status }
}
