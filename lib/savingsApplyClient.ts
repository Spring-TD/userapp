import { createSavingsAccount } from '@/lib/storefrontApplicationClient'

type SavingsApplyResponse = {
  success?: boolean
  message?: string
  error?: string
  data?: {
    accountCreated?: boolean
    account?: { id?: string; accountNumber?: string; bankName?: string; currency?: string; status?: string }
  }
}

export type EnsureSavingsAccountResult = {
  ok: boolean
  accountCreated: boolean
  accountId?: string
  account?: { id?: string; accountNumber?: string; bankName?: string; currency?: string; status?: string }
  message?: string
  error?: string
}

/** POST /api/v1/savings/apply — provision savings account before funding. */
export async function ensureSavingsAccount(
  productId: string,
  options?: { amount?: number; currency?: string },
): Promise<EnsureSavingsAccountResult> {
  const result = await createSavingsAccount(productId, { currency: options?.currency })
  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }
  const data = result.data as SavingsApplyResponse['data'] | undefined
  return {
    ok: true,
    accountCreated: data?.accountCreated === true || Boolean(data?.account?.id),
    accountId: data?.account?.id,
    account: data?.account,
    message: 'Savings account created.',
  }
}
