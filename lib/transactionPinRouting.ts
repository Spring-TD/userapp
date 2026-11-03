import { isUserKycApprovedFromProfile } from '@/lib/kycApproval'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { fetchTransactionPinStatus } from '@/lib/services/externalBankAccountApi'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'
import { kycOnboarding, OnboardingApiError } from '@/lib/kycOnboardingClient'

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

export const KYC_ONBOARDING_PAGE = '/mobile-v2/profile/kyc/create'

/**
 * True when retail KYC onboarding is not finished. Source of truth is account-ms
 * `GET /kyc/onboarding` (404 = no profile yet = not finished); falls back to the profile flags.
 */
async function isKycIncomplete(): Promise<boolean> {
  try {
    const { progress } = await kycOnboarding.get()
    return !(progress.kycCompleted || progress.currentStep === 'done')
  } catch (err) {
    if (err instanceof OnboardingApiError && err.status === 404) return true
    const profile = await fetchAuthUserProfile().catch(() => null)
    return profile ? !isUserKycApprovedFromProfile(profile.kycStatus, profile.kycCompleted) : false
  }
}

/**
 * After sign-in (prototype flow): while KYC is incomplete, land on the KYC welcome first
 * ("Start verification" / "I'll do this later"); the KYC page sends the user on to `next`
 * (via PIN setup when needed). Once KYC is done: honour `next`, prompting PIN setup when missing.
 */
export async function resolvePostLoginPath(next: string | null): Promise<string> {
  let target = safeMobileReturnPath(next, DEFAULT_MOBILE_HOME)
  if (isTransactionPinPath(target)) return target

  // Run both lookups in parallel to avoid serial gateway round-trips on login.
  const [kycIncomplete, needsPin] = await Promise.all([
    isKycIncomplete(),
    userNeedsTransactionPinSetup().catch(() => false),
  ])
  if (kycIncomplete) {
    if (isKycOnboardingPath(target)) return target
    const params = new URLSearchParams({ from: 'login', next: target })
    return `${KYC_ONBOARDING_PAGE}?${params.toString()}`
  }

  if (isKycOnboardingPath(target)) target = DEFAULT_MOBILE_HOME
  if (needsPin) return transactionPinSetupPath(target)
  return target
}
