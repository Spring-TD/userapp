import {
  createFundedProductAccount,
  depositFundedProductAccount,
  type ProvisionedProductAccount,
} from '@/lib/fundedProductAccountClient'
import type { PlatformFields } from '@/lib/platformApplicationFields'
import { isPoliticallyExposedFromPepAnswer } from '@/lib/platformApplicationFields'

export type EnsureInvestmentAccountResult = {
  ok: boolean
  accountCreated: boolean
  applicationId?: string
  accountId?: string
  account?: ProvisionedProductAccount
  message?: string
  error?: string
  duplicateDeposit?: boolean
}

type EnsureInvestmentOptions = {
  amount?: number
  currency?: string
  /** Existing application from prior provision / resume. */
  applicationId?: string
  isPoliticallyExposedPerson?: boolean
  /** @deprecated Prefer `isPoliticallyExposedPerson`. */
  politicallyExposed?: 'yes' | 'no'
  platformFields?: PlatformFields
}

function resolvePlatformFields(options?: EnsureInvestmentOptions): PlatformFields | undefined {
  if (options?.platformFields) return options.platformFields
  const pep =
    options?.isPoliticallyExposedPerson !== undefined
      ? options.isPoliticallyExposedPerson
      : isPoliticallyExposedFromPepAnswer(options?.politicallyExposed)
  if (pep === undefined) return undefined
  // Plata enrollment expects baseline platform fields on investment provision.
  return {
    isPoliticallyExposedPerson: pep,
    monthlyIncome: 0,
    repaymentSource: 'salary',
    maritalStatus: 'single',
  }
}

/**
 * Investment flow per storefront docs:
 * 1) POST /api/v1/investment-accounts (provision + platform fields)
 * 2) POST /api/v1/investment-accounts/:id/deposits (fund)
 * Never use /applications/apply for INVESTMENT.
 */
export async function ensureInvestmentAccount(
  productId: string,
  options?: EnsureInvestmentOptions,
): Promise<EnsureInvestmentAccountResult> {
  const hasAmount = options?.amount != null && options.amount > 0
  const platformFields = resolvePlatformFields(options)
  const currency = options?.currency || 'NGN'

  let applicationId = options?.applicationId?.trim() || ''
  let account = undefined as ProvisionedProductAccount | undefined
  let provisionMessage: string | undefined

  if (!applicationId) {
    const created = await createFundedProductAccount('investment', productId, {
      currency,
      platformFields,
    })
    if (!created.ok) return { ok: false, accountCreated: false, error: created.error }
    applicationId = created.applicationId
    account = created.account
    provisionMessage = created.message
  }

  if (!hasAmount) {
    return {
      ok: true,
      accountCreated: true,
      applicationId,
      accountId: applicationId,
      account,
      message: provisionMessage || 'Investment account created.',
    }
  }

  const deposit = await depositFundedProductAccount('investment', applicationId, options!.amount!, {
    currency,
  })
  if (!deposit.ok) {
    return {
      ok: false,
      accountCreated: Boolean(applicationId),
      applicationId,
      accountId: applicationId,
      account,
      error: deposit.error,
    }
  }

  return {
    ok: true,
    accountCreated: true,
    applicationId,
    accountId: applicationId,
    account,
    duplicateDeposit: deposit.duplicate,
    message: deposit.duplicate
      ? 'Deposit already recorded.'
      : deposit.message || 'Investment deposit successful.',
  }
}
