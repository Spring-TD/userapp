import { apiClient } from "@/lib/api"
import { fetchAuthUserProfile } from "@/lib/userProfileClient"
import type { EnsureLoanAccountResult } from "@/types/loanCatalog"

export type LoanApplyBody = {
  userId: string
  productId: string
  amount?: number
  currency?: string
  email?: string
}

type LoanAccountListResponse = {
  success?: boolean
  data?: Array<{ id?: string; accountType?: string; status?: string }>
  error?: string
}

type LoanApplyResponse = {
  success?: boolean
  message?: string
  error?: string
  data?: {
    type?: string
    accountCreated?: boolean
    account?: { id?: string }
    application?: { id?: string }
  }
}

/** GET /api/v1/loans/user/:userId — list loan accounts for user. */
export async function fetchUserLoanAccounts(userId: string) {
  const res = await apiClient.get<LoanAccountListResponse>(
    `/v1/loans/user/${encodeURIComponent(userId)}`,
    { includeAuth: true, timeout: 30_000 },
  )
  const list = Array.isArray(res.data?.data) ? res.data.data : []
  return { ok: res.data?.success !== false && res.status < 400, accounts: list, raw: res.data }
}

/**
 * Ensures the user has a loan account (backend creates if missing).
 * Tries GET accounts first; if none, POST apply with minimal payload so account-ms can provision.
 */
export async function ensureLoanAccount(productId: string): Promise<EnsureLoanAccountResult> {
  const { user } = await fetchAuthUserProfile()
  const userId = user?.id || user?._id
  if (!userId) {
    return { ok: false, accountCreated: false, error: "Sign in to apply for a loan." }
  }

  try {
    const listed = await fetchUserLoanAccounts(userId)
    if (listed.ok && listed.accounts.length > 0) {
      return {
        ok: true,
        accountCreated: false,
        accountId: listed.accounts[0]?.id,
        message: "Loan account already exists.",
      }
    }
  } catch {
    /* upstream may not implement GET yet — fall through to apply */
  }

  try {
    const res = await apiClient.post<LoanApplyResponse>(
      "/v1/loans/apply",
      {
        userId,
        productId,
        currency: "NGN",
        email: user?.email,
      } satisfies LoanApplyBody,
      { includeAuth: true, timeout: 60_000 },
    )

    const data = res.data
    if (data?.success === false || res.status >= 400) {
      return {
        ok: false,
        accountCreated: false,
        error: data?.error || data?.message || "Could not set up your loan account.",
      }
    }

    const accountCreated =
      data?.data?.accountCreated === true ||
      data?.data?.type === "account" ||
      Boolean(data?.data?.account?.id)

    return {
      ok: true,
      accountCreated,
      accountId: data?.data?.account?.id,
      message: data?.message,
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "response" in e
        ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "")
        : ""
    return {
      ok: false,
      accountCreated: false,
      error: msg || (e instanceof Error ? e.message : "Loan account setup failed."),
    }
  }
}
