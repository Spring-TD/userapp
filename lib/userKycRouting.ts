import { isUserKycApprovedFromProfile } from '@/lib/kycApproval'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'

export { resolvePostLoginPath } from '@/lib/transactionPinRouting'

export { DEFAULT_MOBILE_HOME } from '@/lib/transactionPinRouting'

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

export async function fetchUserKycApproved(): Promise<boolean> {
  const profile = await fetchAuthUserProfile()
  return isUserKycApprovedFromProfile(profile.kycStatus, profile.kycCompleted)
}
