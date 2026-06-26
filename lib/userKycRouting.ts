import { isUserKycApprovedFromProfile } from '@/lib/kycApproval'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'

const DEFAULT_MOBILE_HOME = '/mobile-v2/home'

/** Same-origin relative path only — avoids open redirects from `?next=`. */
export function safeMobileReturnPath(raw: string | null, fallback = DEFAULT_MOBILE_HOME): string {
  if (!raw) return fallback
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback
    if (decoded.includes('://')) return fallback
    if (decoded.startsWith('/api')) return fallback
    if (decoded.startsWith('/mobile-v2/auth')) return fallback
    return decoded
  } catch {
    return fallback
  }
}

export function isKycOnboardingPath(path: string): boolean {
  return path.includes('/profile/kyc') || path.includes('/mobile-v2/kyc/')
}

/**
 * After sign-in, skip KYC onboarding when profile already reports approved/completed.
 */
export async function resolvePostLoginPath(next: string | null): Promise<string> {
  const target = safeMobileReturnPath(next)
  if (!isKycOnboardingPath(target)) return target

  const profile = await fetchAuthUserProfile()
  if (isUserKycApprovedFromProfile(profile.kycStatus, profile.kycCompleted)) {
    return DEFAULT_MOBILE_HOME
  }
  return target
}

export async function fetchUserKycApproved(): Promise<boolean> {
  const profile = await fetchAuthUserProfile()
  return isUserKycApprovedFromProfile(profile.kycStatus, profile.kycCompleted)
}
