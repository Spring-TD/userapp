import { applyProductOneShot, createSavingsAccount } from '@/lib/storefrontApplicationClient'
import type { PlatformFields } from '@/lib/platformApplicationFields'
import { isPoliticallyExposedFromPepAnswer } from '@/lib/platformApplicationFields'

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

type EnsureSavingsOptions = {
  amount?: number
  currency?: string
  /** Preferred: platform PEP boolean. */
  isPoliticallyExposedPerson?: boolean
  /**
   * @deprecated Prefer `isPoliticallyExposedPerson`. Mapped to the platform field when set.
   */
  politicallyExposed?: 'yes' | 'no'
}

function resolvePlatformFields(options?: EnsureSavingsOptions): PlatformFields | undefined {
  const pep =
    options?.isPoliticallyExposedPerson !== undefined
      ? options.isPoliticallyExposedPerson
      : isPoliticallyExposedFromPepAnswer(options?.politicallyExposed)
  if (pep === undefined) return undefined
  return { isPoliticallyExposedPerson: pep }
}

/** POST /api/v1/savings/apply — provision savings account before funding. */
export async function ensureSavingsAccount(
  productId: string,
  options?: EnsureSavingsOptions,
): Promise<EnsureSavingsAccountResult> {
  const hasAmount = options?.amount != null && options.amount > 0
  const platformFields = resolvePlatformFields(options)
  const result = hasAmount
    ? await applyProductOneShot(productId, {
        amount: options!.amount,
        currency: options?.currency,
        productType: 'SAVINGS',
        platformFields,
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
