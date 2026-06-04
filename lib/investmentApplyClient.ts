import { applyProductOneShot } from '@/lib/storefrontApplicationClient'

type InvestmentApplyResponse = {
  success?: boolean
  message?: string
  error?: string
  data?: {
    accountCreated?: boolean
    account?: { id?: string; accountNumber?: string; bankName?: string; currency?: string; status?: string }
  }
}

export type EnsureInvestmentAccountResult = {
  ok: boolean
  accountCreated: boolean
  accountId?: string
  account?: { id?: string; accountNumber?: string; bankName?: string; currency?: string; status?: string }
  message?: string
  error?: string
}

/** POST /api/v1/investments/apply — provision investment account before funding. */
export async function ensureInvestmentAccount(
  productId: string,
  options?: { amount?: number; currency?: string },
): Promise<EnsureInvestmentAccountResult> {
  const result = await applyProductOneShot(productId, options)
  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }
  return {
    ok: true,
    accountCreated: true,
    accountId: result.application?.id || result.application?._id,
    account: result.application?.productWallet?.upstreamAccount,
    message: 'Investment application submitted.',
  }
}
