import { fetchAuthUserProfile } from "@/lib/userProfileClient"
import { cacheAuthUserId, readCachedAuthUserId } from "@/lib/userWallet"
import { getAccessToken } from "@/lib/cookieAuth"

/** JWT claim — may differ from the client-auth `user.id` expected by account-ms wallet routes. */
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

function userIdCandidatesFromAccessToken(): string[] {
  const token = getAccessToken()
  if (!token) return []
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as Record<string, unknown>
    return uniqueIds([
      payload.userId,
      payload.id,
      payload._id,
      payload.sub,
      payload.user_id,
    ])
  } catch {
    return []
  }
}

function uniqueIds(values: unknown[]): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const value of values) {
    const id = typeof value === "string" ? value.trim() : value != null ? String(value).trim() : ""
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/**
 * Account-ms wallet routes expect the same `user.id` as client-auth (login / registration), not always JWT `sub`.
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

export async function resolveWalletUserIdCandidates(fallback?: string | null): Promise<string[]> {
  const cached = readCachedAuthUserId()
  let profileId: string | null = null

  try {
    const { user } = await fetchAuthUserProfile()
    profileId = user?.id?.trim() || user?._id?.trim() || null
    if (profileId) cacheAuthUserId(profileId)
  } catch {
    /* profile optional */
  }

  return uniqueIds([
    fallback,
    profileId,
    cached,
    ...userIdCandidatesFromAccessToken(),
    userIdFromAccessToken(),
  ])
}
