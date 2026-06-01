import { fetchMobileProductById } from '@/lib/fetchMobileProductById'
import { fetchAuthUserProfile } from '@/lib/userProfileClient'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'
import { TENANT_MERCHANT_ID_STORAGE_KEY } from '@/lib/mobileTenant/storageKeys'

export type ProductApplyBody = {
  userId: string
  productId: string
  amount: number
  currency: string
  email?: string
  merchantId?: string
  applicantName?: string
  phone?: string
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

/**
 * Builds the account-ms apply payload (`userId`, `productId`, `amount`, `currency`).
 */
export async function buildProductApplyBody(
  productId: string,
  options?: { amount?: number; currency?: string },
): Promise<BuildProductApplyBodyResult> {
  const trimmedProductId = productId.trim()
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
  const merchantId =
    typeof window !== 'undefined'
      ? sessionStorage.getItem(TENANT_MERCHANT_ID_STORAGE_KEY)?.trim() || undefined
      : undefined
  const applicantName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()

  return {
    ok: true,
    body: {
      userId,
      productId: trimmedProductId,
      amount,
      currency: options?.currency?.trim() || 'NGN',
      ...(user?.email ? { email: user.email } : {}),
      ...(merchantId ? { merchantId } : {}),
      ...(applicantName ? { applicantName } : {}),
      ...(user?.phone ? { phone: user.phone } : {}),
      ...(user?.country ? { country: user.country } : {}),
    },
  }
}
