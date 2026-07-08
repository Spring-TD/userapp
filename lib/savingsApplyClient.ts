import { applyProductOneShot, createSavingsAccount } from '@/lib/storefrontApplicationClient'
import { pepStatusSubmission } from '@/lib/applicantProfileFields'

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
  options?: { amount?: number; currency?: string; politicallyExposed?: 'yes' | 'no' },
): Promise<EnsureSavingsAccountResult> {
  const hasAmount = options?.amount != null && options.amount > 0
  const requirementSubmissions = options?.politicallyExposed
    ? [pepStatusSubmission(options.politicallyExposed)]
    : undefined
  const result = hasAmount
    ? await applyProductOneShot(productId, {
        amount: options!.amount,
        currency: options?.currency,
        productType: 'SAVINGS',
        requirementSubmissions,
      })
    : await createSavingsAccount(productId, { currency: options?.currency })

  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }

  if (hasAmount) {
    const application = 'application' in result ? result.application : undefined
    return {
      ok: true,
      accountCreated: true,
      accountId: application?.id || application?._id,
      account: application?.productWallet?.upstreamAccount,
      message: 'Savings application submitted.',
    }
  }

  const data = (result as { data?: SavingsApplyResponse['data'] }).data
  return {
    ok: true,
    accountCreated: data?.accountCreated === true || Boolean(data?.account?.id),
    accountId: data?.account?.id,
    account: data?.account,
    message: 'Savings account created.',
  }
}
