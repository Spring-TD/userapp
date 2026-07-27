import { apiClient } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { buildProductApplyBody } from '@/lib/productApplyPayload'
import type { PlatformFields } from '@/lib/platformApplicationFields'
import { attachPlatformFieldsToApplyBody } from '@/lib/platformApplicationFields'
import { resolveWalletUserId } from '@/lib/resolveWalletUserId'

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  error?: string
  data?: T
  duplicate?: boolean
}

export type FundedProductAccountKind = 'savings' | 'investment'

export type ProvisionedProductAccount = {
  id?: string
  accountNumber?: string
  bankName?: string
  currency?: string
  status?: string
  balance?: number
}

export type CreateFundedProductAccountResult =
  | {
      ok: true
      applicationId: string
      account?: ProvisionedProductAccount
      message?: string
    }
  | { ok: false; error: string }

export type DepositFundedProductAccountResult =
  | { ok: true; duplicate?: boolean; message?: string; data?: unknown }
  | { ok: false; error: string; status?: number }

function parseApiError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const row = data as ApiEnvelope<unknown>
    if (row.error) return String(row.error)
    if (row.message) return String(row.message)
  }
  return status === 402 ? 'Insufficient balance in wallet' : `Request failed (${status})`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickString(row: Record<string, unknown> | null, ...keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function normalizeProvisionedAccount(raw: unknown): ProvisionedProductAccount | undefined {
  const row = asRecord(raw)
  if (!row) return undefined

  const wallet = asRecord(row.productWallet)
  const upstream = asRecord(wallet?.upstreamAccount) || asRecord(row.upstreamAccount)

  const accountNumber =
    pickString(row, 'accountNumber') || pickString(upstream, 'accountNumber')
  const bankName = pickString(row, 'bankName') || pickString(upstream, 'bankName')
  const currency = pickString(row, 'currency') || pickString(upstream, 'currency') || 'NGN'
  const status =
    pickString(row, 'status', 'provisionStatus') ||
    pickString(upstream, 'provisionStatus', 'status')
  const id = pickString(row, 'id', 'accountId') || pickString(upstream, 'accountId', 'id')
  const balanceRaw = row.balance ?? upstream?.balance
  const balance =
    typeof balanceRaw === 'number' && Number.isFinite(balanceRaw) ? balanceRaw : undefined

  if (!accountNumber && !id && balance == null && !status) return undefined

  return {
    id: id || undefined,
    accountNumber: accountNumber || undefined,
    bankName: bankName || undefined,
    currency,
    status: status || undefined,
    balance,
  }
}

function parseCreateResponse(data: unknown): {
  applicationId: string
  account?: ProvisionedProductAccount
  message?: string
} {
  const envelope = asRecord(data)
  const inner = asRecord(envelope?.data) || envelope
  const applicationId =
    pickString(inner, 'applicationId', 'id', '_id') ||
    pickString(asRecord(inner?.application), 'id', '_id', 'applicationId')

  const account =
    normalizeProvisionedAccount(inner?.account) ||
    normalizeProvisionedAccount(asRecord(inner?.application)?.productWallet) ||
    normalizeProvisionedAccount(inner)

  return {
    applicationId,
    account,
    message: pickString(envelope, 'message') || undefined,
  }
}

function createPath(kind: FundedProductAccountKind): string {
  return kind === 'investment' ? ENDPOINTS.investmentAccounts.create : ENDPOINTS.savingsAccounts.create
}

function depositsPath(kind: FundedProductAccountKind, applicationId: string): string {
  return kind === 'investment'
    ? ENDPOINTS.investmentAccounts.deposits(applicationId)
    : ENDPOINTS.savingsAccounts.deposits(applicationId)
}

/**
 * POST /api/v1/savings-accounts | /api/v1/investment-accounts
 * Do not use /applications/apply for these product types.
 */
export async function createFundedProductAccount(
  kind: FundedProductAccountKind,
  productId: string,
  options?: { currency?: string; platformFields?: PlatformFields },
): Promise<CreateFundedProductAccountResult> {
  const built = await buildProductApplyBody(productId, {
    currency: options?.currency || 'NGN',
    productType: kind === 'investment' ? 'INVESTMENT' : 'SAVINGS',
  })
  if (!built.ok) return { ok: false, error: built.error }

  const { userId, currency, email, merchantId, applicantName, phone, bvn, appId, country } =
    built.body

  const payload: Record<string, unknown> = {
    userId,
    productId: built.body.productId,
    currency,
    ...(email ? { email } : {}),
    ...(applicantName ? { applicantName } : {}),
    ...(phone ? { phone } : {}),
    ...(bvn ? { bvn } : {}),
    ...(merchantId ? { merchantId } : {}),
    ...(appId ? { appId } : {}),
    ...(country ? { country } : {}),
  }

  const platformFields = options?.platformFields
  const finalPayload =
    platformFields && typeof platformFields.isPoliticallyExposedPerson === 'boolean'
      ? attachPlatformFieldsToApplyBody(payload, platformFields)
      : payload

  const res = await apiClient.post<ApiEnvelope<unknown>>(createPath(kind), finalPayload, {
    includeAuth: true,
    timeout: 60_000,
  })

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false, error: parseApiError(res.data, res.status) }
  }

  const parsed = parseCreateResponse(res.data)
  if (!parsed.applicationId) {
    return {
      ok: false,
      error: `Could not create ${kind} account (missing application id).`,
    }
  }

  return {
    ok: true,
    applicationId: parsed.applicationId,
    account: parsed.account,
    message:
      parsed.message ||
      (kind === 'investment' ? 'Investment account created.' : 'Savings account created.'),
  }
}

/** POST …/:applicationId/deposits — debit PRIMARY wallet. */
export async function depositFundedProductAccount(
  kind: FundedProductAccountKind,
  applicationId: string,
  amount: number,
  options?: { currency?: string; referenceId?: string },
): Promise<DepositFundedProductAccountResult> {
  const userId = await resolveWalletUserId()
  if (!userId) return { ok: false, error: 'Sign in to continue.' }
  if (!applicationId.trim()) return { ok: false, error: 'Missing account application id.' }
  if (!(amount > 0)) return { ok: false, error: 'Enter a valid deposit amount.' }

  const referenceId =
    options?.referenceId?.trim() ||
    `${kind}-dep-${applicationId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const payload = {
    userId,
    amount,
    currency: options?.currency?.trim() || 'NGN',
    referenceId,
  }

  const res = await apiClient.post<ApiEnvelope<unknown>>(
    depositsPath(kind, applicationId.trim()),
    payload,
    { includeAuth: true, timeout: 60_000 },
  )

  if (res.data?.success === false || res.status >= 400) {
    return { ok: false, error: parseApiError(res.data, res.status), status: res.status }
  }

  return {
    ok: true,
    duplicate: Boolean(res.data?.duplicate),
    message: res.data?.message || 'Deposit successful.',
    data: res.data?.data,
  }
}
