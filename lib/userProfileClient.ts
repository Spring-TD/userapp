import api from '@/lib/api'

/**
 * Authenticated user as returned by GET /api/v1/user/profile (proxied to client-auth-ms).
 * Field names follow the API (snake_case).
 */
export type AuthUserProfile = {
  _id?: string
  id?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  user_type?: string
  status?: string
  email_verified?: boolean
  phone_verified?: boolean
  user_merchant_id?: string
  country?: string
  bvn?: string
  app_id?: string
  role_id?: string
  user_ref?: string
  created_at?: string
  updated_at?: string
  last_login_at?: string
  /** Optional image URL if the backend adds it later */
  avatar_url?: string
  profile_image?: string
  image?: string
}

type ProfileApiResponse = {
  success: boolean
  data?: { user?: unknown; kycStatus?: string; kycCompleted?: boolean } | (AuthUserProfile & Record<string, unknown>)
  error?: string
  message?: string
}

export type AuthUserProfilePayload = {
  user: AuthUserProfile | null
  kycStatus?: string
  kycCompleted?: boolean
  error: string | null
}

function extractProfileKycFields(inner: unknown): { kycStatus?: string; kycCompleted?: boolean } {
  if (!inner || typeof inner !== "object") return {}
  const d = inner as Record<string, unknown>
  const kycStatus = typeof d.kycStatus === "string" ? d.kycStatus : undefined
  const kycCompleted = typeof d.kycCompleted === "boolean" ? d.kycCompleted : undefined
  return { kycStatus, kycCompleted }
}

export type UpdateAuthUserProfileInput = {
  first_name?: string
  last_name?: string
  phone?: string
  country?: string
  avatar_url?: string
}

function pickStr(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/** Unwrap `firstName` / `lastName` etc. so UI always has snake_case fields. */
export function normalizeAuthUserProfile(raw: unknown): AuthUserProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Record<string, unknown>
  const idStr =
    typeof u.id === 'string'
      ? u.id.trim()
      : u.id != null
        ? String(u.id)
        : typeof u._id === 'string'
          ? u._id.trim()
          : u._id != null
            ? String(u._id)
            : ''
  return {
    ...u,
    id: idStr || undefined,
    _id: idStr || undefined,
    email: pickStr(u, 'email'),
    first_name: pickStr(u, 'first_name', 'firstName', 'firstname'),
    last_name: pickStr(u, 'last_name', 'lastName', 'lastname'),
    phone: pickStr(u, 'phone', 'phoneNumber'),
    user_type: pickStr(u, 'user_type', 'userType'),
    status: pickStr(u, 'status'),
    user_merchant_id: pickStr(u, 'user_merchant_id', 'userMerchantId', 'merchantId'),
    country: pickStr(u, 'country'),
    bvn: pickStr(u, 'bvn', 'BVN', 'bank_verification_number', 'bankVerificationNumber'),
    app_id: pickStr(u, 'app_id', 'appId'),
    role_id: pickStr(u, 'role_id', 'roleId'),
    user_ref: pickStr(u, 'user_ref', 'userRef'),
    created_at: pickStr(u, 'created_at', 'createdAt'),
    updated_at: pickStr(u, 'updated_at', 'updatedAt'),
    last_login_at: pickStr(u, 'last_login_at', 'lastLoginAt'),
    avatar_url: pickStr(u, 'avatar_url', 'avatarUrl', 'profile_image', 'profileImage'),
  } as AuthUserProfile
}

/**
 * Loads the current user via Next BFF `GET /api/v1/user/profile`.
 * Response may include sibling fields `kycStatus` and `kycCompleted` next to `user`.
 */
export async function fetchAuthUserProfile(): Promise<AuthUserProfilePayload> {
  try {
    const { data } = await api.get<ProfileApiResponse>('/v1/user/profile')
    const inner = data?.data
    const { kycStatus, kycCompleted } = extractProfileKycFields(inner)
    const rawUser =
      inner && typeof inner === 'object' && 'user' in inner
        ? (inner as { user?: unknown }).user
        : inner && typeof inner === 'object' && ('email' in inner || 'first_name' in inner || 'firstName' in inner)
          ? inner
          : null
    const user = rawUser ? normalizeAuthUserProfile(rawUser) : null
    if (data?.success && user) {
      return { user, kycStatus, kycCompleted, error: null }
    }
    return {
      user: null,
      kycStatus,
      kycCompleted,
      error: data?.error || data?.message || 'Unable to load profile',
    }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error ?? '')
        : ''
    return {
      user: null,
      error: msg || (e instanceof Error ? e.message : 'Unable to load profile'),
    }
  }
}

export async function updateAuthUserProfile(input: UpdateAuthUserProfileInput): Promise<{
  user: AuthUserProfile | null
  error: string | null
}> {
  try {
    const body = {
      ...(input.first_name != null ? { first_name: input.first_name.trim() } : {}),
      ...(input.last_name != null ? { last_name: input.last_name.trim() } : {}),
      ...(input.phone != null ? { phone: input.phone.trim() } : {}),
      ...(input.country != null ? { country: input.country.trim() } : {}),
      ...(input.avatar_url != null ? { avatar_url: input.avatar_url.trim() } : {}),
    }

    const { data } = await api.put<ProfileApiResponse>('/v1/user/profile', body)
    const inner = data?.data
    const rawUser =
      inner && typeof inner === 'object' && 'user' in inner
        ? (inner as { user?: unknown }).user
        : inner && typeof inner === 'object'
          ? inner
          : null
    const user = rawUser ? normalizeAuthUserProfile(rawUser) : null
    if (data?.success !== false) {
      return { user, error: null }
    }
    return { user: null, error: data?.error || data?.message || 'Unable to update profile' }
  } catch (e: unknown) {
    const msg =
      e && typeof e === 'object' && 'response' in e
        ? String((e as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ?? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
        : ''
    return {
      user: null,
      error: msg || (e instanceof Error ? e.message : 'Unable to update profile'),
    }
  }
}
