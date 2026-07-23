import { applyProductOneShot } from '@/lib/storefrontApplicationClient'
import type { PlatformFields } from '@/lib/platformApplicationFields'
import { isPoliticallyExposedFromPepAnswer } from '@/lib/platformApplicationFields'

export type EnsureInvestmentAccountResult = {
  ok: boolean
  accountCreated: boolean
  accountId?: string
  account?: { id?: string; accountNumber?: string; bankName?: string; currency?: string; status?: string }
  message?: string
  error?: string
}

type EnsureInvestmentOptions = {
  amount?: number
  currency?: string
  /** Preferred: platform PEP boolean. */
  isPoliticallyExposedPerson?: boolean
  /**
   * @deprecated Prefer `isPoliticallyExposedPerson`. Mapped to the platform field when set.
   */
  politicallyExposed?: 'yes' | 'no'
}

function resolvePlatformFields(options?: EnsureInvestmentOptions): PlatformFields | undefined {
  const pep =
    options?.isPoliticallyExposedPerson !== undefined
      ? options.isPoliticallyExposedPerson
      : isPoliticallyExposedFromPepAnswer(options?.politicallyExposed)
  if (pep === undefined) return undefined
  return { isPoliticallyExposedPerson: pep }
}

/** POST /api/v1/investments/apply — provision investment account before funding. */
export async function ensureInvestmentAccount(
  productId: string,
  options?: EnsureInvestmentOptions,
): Promise<EnsureInvestmentAccountResult> {
  const platformFields = resolvePlatformFields(options)

  const result = await applyProductOneShot(productId, {
    amount: options?.amount,
    currency: options?.currency,
    productType: 'INVESTMENT',
    platformFields,
  })
  if (!result.ok) return { ok: false, accountCreated: false, error: result.error }
  return {
    ok: true,
    accountCreated: true,
    accountId: result.application?.id || result.application?._id,
    account: result.application?.productWallet?.upstreamAccount,
    message: 'Investment application submitted.',
  }
}
