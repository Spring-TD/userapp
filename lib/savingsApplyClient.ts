import {
  createFundedProductAccount,
  depositFundedProductAccount,
  type ProvisionedProductAccount,
} from '@/lib/fundedProductAccountClient'
import type { PlatformFields } from '@/lib/platformApplicationFields'
import {
  baselinePlatformFieldsForEnrollment,
  isPoliticallyExposedFromPepAnswer,
} from '@/lib/platformApplicationFields'

export type EnsureSavingsAccountResult = {
  ok: boolean
  accountCreated: boolean
  applicationId?: string
  accountId?: string
  account?: ProvisionedProductAccount
  message?: string
  error?: string
  duplicateDeposit?: boolean
}

type EnsureSavingsOptions = {
  amount?: number
  currency?: string
  /** Existing application from prior provision / resume. */
  applicationId?: string
  isPoliticallyExposedPerson?: boolean
  /** @deprecated Prefer `isPoliticallyExposedPerson`. */
  politicallyExposed?: 'yes' | 'no'
  platformFields?: PlatformFields
}

function resolvePlatformFields(options?: EnsureSavingsOptions): PlatformFields | undefined {
  if (options?.platformFields?.isPoliticallyExposedPerson !== undefined) {
    return baselinePlatformFieldsForEnrollment(
      options.platformFields.isPoliticallyExposedPerson,
      options.platformFields,
    )
  }
  const pep =
    options?.isPoliticallyExposedPerson !== undefined
      ? options.isPoliticallyExposedPerson
      : isPoliticallyExposedFromPepAnswer(options?.politicallyExposed)
  if (pep === undefined) return undefined
  return baselinePlatformFieldsForEnrollment(pep, options?.platformFields)
}

/**
 * Savings flow per storefront docs:
 * 1) POST /api/v1/savings-accounts (provision)
 * 2) POST /api/v1/savings-accounts/:id/deposits (fund)
 * Never use /applications/apply for SAVINGS.
 */
export async function ensureSavingsAccount(
  productId: string,
  options?: EnsureSavingsOptions,
): Promise<EnsureSavingsAccountResult> {
  const hasAmount = options?.amount != null && options.amount > 0
  const platformFields = resolvePlatformFields(options)
  const currency = options?.currency || 'NGN'

  let applicationId = options?.applicationId?.trim() || ''
  let account = undefined as ProvisionedProductAccount | undefined
  let provisionMessage: string | undefined

  if (!applicationId) {
    if (platformFields?.isPoliticallyExposedPerson === undefined) {
      return {
        ok: false,
        accountCreated: false,
        error: 'Please indicate whether you are a politically exposed person.',
      }
    }
    const created = await createFundedProductAccount('savings', productId, {
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
      message: provisionMessage || 'Savings account created.',
    }
  }

  const deposit = await depositFundedProductAccount('savings', applicationId, options!.amount!, {
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
      : deposit.message || 'Savings deposit successful.',
  }
}
