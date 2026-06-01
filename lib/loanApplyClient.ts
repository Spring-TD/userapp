import { apiClient } from "@/lib/api"
import { buildProductApplyBody } from "@/lib/productApplyPayload"
import { initializeProductApplication } from "@/lib/storefrontApplicationClient"
import type { EnsureLoanAccountResult } from "@/types/loanCatalog"

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
 * Tries GET accounts first; if none, POST apply with required payload.
 */
export async function ensureLoanAccount(
  productId: string,
  options?: { amount?: number; currency?: string },
): Promise<EnsureLoanAccountResult> {
  const result = await initializeProductApplication(productId, options)
  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }
  return {
    ok: true,
    accountCreated: true,
    accountId: result.application?.productWallet?.upstreamAccount?.accountNumber || result.applicationId,
    message: "Loan application initialized.",
  }
}
