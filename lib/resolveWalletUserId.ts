import { fetchAuthUserProfile } from "@/lib/userProfileClient"
import { cacheAuthUserId, readCachedAuthUserId } from "@/lib/userWallet"
import { getAccessToken } from "@/lib/cookieAuth"

/** JWT claim — may differ from client-auth `user.id` used by wallet-ms. */
function userIdFromAccessToken(): string | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>
    const id = payload.userId ?? payload.id ?? payload.sub
    return typeof id === "string" && id.trim() ? id.trim() : null
  } catch {
    return null
  }
}

/**
 * Wallet-ms expects the same `user.id` as client-auth (login / registration), not always JWT `sub`.
 */
export async function resolveWalletUserId(fallback?: string | null): Promise<string | null> {
  const cached = readCachedAuthUserId()
  if (cached) return cached

  try {
    const { user } = await fetchAuthUserProfile()
    const profileId = user?.id?.trim()
    if (profileId) {
      cacheAuthUserId(profileId)
      return profileId
    }
  } catch {
    /* profile optional */
  }

  const fromToken = userIdFromAccessToken()
  if (fromToken) return fromToken

  const fb = fallback?.trim()
  return fb || null
}
