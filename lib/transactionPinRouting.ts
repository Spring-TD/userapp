import { isUserKycApprovedFromProfile } from '@/lib/kycApproval'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { fetchTransactionPinStatus } from '@/lib/services/externalBankAccountApi'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'

import {
  isKycOnboardingPath,
  safeMobileReturnPath,
} from '@/lib/userKycRouting'

export const DEFAULT_MOBILE_HOME = '/mobile-v2/home'
export const TRANSACTION_PIN_PAGE = '/mobile-v2/transaction-pin'

export function isTransactionPinPath(path: string): boolean {
  return path.startsWith(TRANSACTION_PIN_PAGE)
}

export function transactionPinSetupPath(returnTo: string): string {
  const params = new URLSearchParams({
    setup: '1',
    returnTo: safeMobileReturnPath(returnTo),
  })
  return `${TRANSACTION_PIN_PAGE}?${params.toString()}`
}

/** True when the user should be prompted to create a transaction PIN. */
export async function userNeedsTransactionPinSetup(userIdHint?: string | null): Promise<boolean> {
  const userId = await resolveWalletUserId(userIdHint)
  if (!userId) return false

  const result = await fetchTransactionPinStatus(userId)
  if (!result.status) return false
  return !result.status.hasTransactionPin
}

/**
 * After sign-in: honour safe `next`, skip redundant KYC onboarding, then prompt PIN setup when missing.
 */
export async function resolvePostLoginPath(next: string | null): Promise<string> {
  let target = safeMobileReturnPath(next, DEFAULT_MOBILE_HOME)
  const needsKycCheck = isKycOnboardingPath(target)
  const pinPath = isTransactionPinPath(target)

  const [profile, needsPin] = await Promise.all([
    needsKycCheck ? fetchAuthUserProfile() : Promise.resolve(null),
    pinPath ? Promise.resolve(false) : userNeedsTransactionPinSetup(),
  ])

  if (
    needsKycCheck &&
    profile &&
    isUserKycApprovedFromProfile(profile.kycStatus, profile.kycCompleted)
  ) {
    target = DEFAULT_MOBILE_HOME
  }

  if (isTransactionPinPath(target)) return target

  if (needsPin) {
    return transactionPinSetupPath(target)
  }

  return target
}
