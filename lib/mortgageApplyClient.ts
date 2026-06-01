import { apiClient } from "@/lib/api"
import { buildProductApplyBody } from "@/lib/productApplyPayload"
import { initializeProductApplication } from "@/lib/storefrontApplicationClient"
import type { EnsureMortgageAccountResult } from "@/types/mortgageCatalog"

type MortgageAccountListResponse = {
  success?: boolean
  data?: Array<{ id?: string; accountType?: string; status?: string }>
  error?: string
}

type MortgageApplyResponse = {
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

/** GET /api/v1/mortgages/user/:userId — list mortgage accounts for user. */
export async function fetchUserMortgageAccounts(userId: string) {
  const res = await apiClient.get<MortgageAccountListResponse>(
    `/v1/mortgages/user/${encodeURIComponent(userId)}`,
    { includeAuth: true, timeout: 30_000 },
  )
  const list = Array.isArray(res.data?.data) ? res.data.data : []
  return { ok: res.data?.success !== false && res.status < 400, accounts: list, raw: res.data }
}

/**
 * Ensures the user has a mortgage account (backend creates if missing).
 */
export async function ensureMortgageAccount(
  productId: string,
  options?: { amount?: number; currency?: string },
): Promise<EnsureMortgageAccountResult> {
  const result = await initializeProductApplication(productId, options)
  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }
  return {
    ok: true,
    accountCreated: true,
    accountId: result.application?.productWallet?.upstreamAccount?.accountNumber || result.applicationId,
    message: "Mortgage application initialized.",
  }
}
