import { apiClient } from "@/lib/api"
import { fetchAuthUserProfile } from "@/lib/userProfileClient"
import type { EnsureMortgageAccountResult } from "@/types/mortgageCatalog"

export type MortgageApplyBody = {
  userId: string
  productId: string
  amount?: number
  currency?: string
  email?: string
}

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
): Promise<EnsureMortgageAccountResult> {
  const { user } = await fetchAuthUserProfile()
  const userId = user?.id || user?._id
  if (!userId) {
    return { ok: false, accountCreated: false, error: "Sign in to apply for a mortgage." }
  }

  try {
    const listed = await fetchUserMortgageAccounts(userId)
    if (listed.ok && listed.accounts.length > 0) {
      return {
        ok: true,
        accountCreated: false,
        accountId: listed.accounts[0]?.id,
        message: "Mortgage account already exists.",
      }
    }
  } catch {
    /* upstream may not implement GET yet */
  }

  try {
    const res = await apiClient.post<MortgageApplyResponse>(
      "/v1/mortgages/apply",
      {
        userId,
        productId,
        currency: "NGN",
        email: user?.email,
      } satisfies MortgageApplyBody,
      { includeAuth: true, timeout: 60_000 },
    )

    const data = res.data
    if (data?.success === false || res.status >= 400) {
      return {
        ok: false,
        accountCreated: false,
        error: data?.error || data?.message || "Could not set up your mortgage account.",
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
      error: msg || (e instanceof Error ? e.message : "Mortgage account setup failed."),
    }
  }
}
