import api from '@/lib/api'
import { fetchMobileProductById } from '@/lib/fetchMobileProductById'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { TENANT_MERCHANT_ID_STORAGE_KEY } from '@/lib/mobileTenant/storageKeys'
import { getManualKycStatus, isManualKycComplete } from '@/lib/manualKycClient'

export type ProductApplyBody = {
  userId: string
  productId: string
  productType?: 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY' | string
  amount: number
  currency: string
  email: string
  merchantId: string
  applicantName: string
  phone: string
  bvn: string
  country?: string
}

export type BuildProductApplyBodyResult =
  | { ok: true; body: ProductApplyBody }
  | { ok: false; error: string }

function parsePositiveAmount(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Default amount for account provisioning when user has not entered one yet. */
export async function resolveDefaultApplyAmount(productId: string): Promise<number> {
  try {
    const product = await fetchMobileProductById(productId)
    const fromMin = parsePositiveAmount(product?.amountMin)
    if (fromMin != null) return fromMin
    const fromPrice = parsePositiveAmount(product?.price)
    if (fromPrice != null) return fromPrice
    const fromProperty = parsePositiveAmount(product?.propertyValue)
    if (fromProperty != null) return fromProperty
  } catch {
    /* use fallback */
  }
  return 1
}

function pickStrFromRecord(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return ''
}

function bvnFromProfile(user: AuthUserProfile | null): string {
  if (!user) return ''
  const row = user as Record<string, unknown>
  return pickStrFromRecord(row, 'bvn', 'BVN', 'bank_verification_number', 'bankVerificationNumber')
}

async function bvnFromKycStatus(userId: string): Promise<string> {
  try {
    const { data } = await api.get<{ success?: boolean; data?: unknown }>(
      `/compliance/status/${encodeURIComponent(userId)}`,
      { includeAuth: true, timeout: 20_000 },
    )
    const root = data?.data
    if (!root || typeof root !== 'object') return ''
    const row = root as Record<string, unknown>
    const direct = pickStrFromRecord(row, 'bvn', 'BVN', 'bank_verification_number', 'bankVerificationNumber')
    if (direct) return direct
    const personal = row.personalInfo
    if (personal && typeof personal === 'object') {
      return pickStrFromRecord(personal as Record<string, unknown>, 'bvn', 'BVN')
    }
    const profile = row.profile
    if (profile && typeof profile === 'object') {
      return pickStrFromRecord(profile as Record<string, unknown>, 'bvn', 'BVN')
    }
  } catch {
    /* optional */
  }
  return ''
}

async function bvnFromManualKyc(): Promise<string> {
  try {
    const status = await getManualKycStatus()
    if (!isManualKycComplete(status)) return ''
    return status.manualKyc?.bvnNormalized || status.manualKyc?.bvn || ''
  } catch {
    return ''
  }
}

function resolveMerchantId(sessionMerchantId: string | undefined, user: AuthUserProfile | null): string {
  if (sessionMerchantId?.trim()) return sessionMerchantId.trim()
  const fromUser = user?.user_merchant_id?.trim()
  if (fromUser) return fromUser
  const row = user as Record<string, unknown> | null
  if (row) {
    return pickStrFromRecord(row, 'merchantId', 'merchant_id', 'user_merchant_id')
  }
  return ''
}

/**
 * Builds the account-ms `POST /applications/init` payload per storefront API docs.
 */
export async function buildProductApplyBody(
  productId: string,
  options?: { amount?: number; currency?: string; productType?: ProductApplyBody['productType'] },
): Promise<BuildProductApplyBodyResult> {
  const trimmedProductId = sanitizeProductId(productId)
  if (!trimmedProductId) {
    return { ok: false, error: 'No product selected.' }
  }

  const userId = await resolveWalletUserId()
  if (!userId) {
    return { ok: false, error: 'Sign in to continue.' }
  }

  const explicitAmount = parsePositiveAmount(options?.amount)
  const amount = explicitAmount ?? (await resolveDefaultApplyAmount(trimmedProductId))

  const { user } = await fetchAuthUserProfile()
  const sessionMerchantId =
    typeof window !== 'undefined'
      ? sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY)?.trim() || undefined
      : undefined
  const merchantId = resolveMerchantId(sessionMerchantId, user)
  const applicantName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  const email = user?.email?.trim() || ''
  const phone = user?.phone?.trim() || ''
  const bvn = bvnFromProfile(user) || (await bvnFromManualKyc()) || (await bvnFromKycStatus(userId))

  return {
    ok: true,
    body: {
      userId,
      productId: trimmedProductId,
      ...(options?.productType ? { productType: options.productType } : {}),
      amount,
      currency: options?.currency?.trim() || 'NGN',
      email,
      merchantId,
      applicantName,
      phone,
      bvn,
      ...(user?.country ? { country: user.country } : {}),
    },
  }
}
