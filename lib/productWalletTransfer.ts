import type { ProductApplication } from '@/types/productApplication'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickFiniteNumber(...vals: unknown[]): number | undefined {
  for (const value of vals) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  }
  return undefined
}

function approvalWallet(application: ProductApplication): Record<string, unknown> | null {
  const raw = application as ProductApplication & {
    approval?: { wallet?: unknown; disbursementDeferred?: unknown }
    contractSnapshot?: { approval?: { wallet?: unknown; disbursementDeferred?: unknown } }
    disbursementDeferred?: boolean
  }
  return (
    asRecord(raw.approval?.wallet) ||
    asRecord(raw.contractSnapshot?.approval?.wallet) ||
    null
  )
}

/** True when backend marks the loan/mortgage as disbursed (funds credited). */
export function isApplicationDisbursedForWallet(application: ProductApplication): boolean {
  const raw = application as ProductApplication & {
    disbursementDeferred?: boolean
    approval?: { disbursementDeferred?: boolean; postApprovalFulfillment?: { status?: string } }
    contractSnapshot?: {
      approval?: { disbursementDeferred?: boolean; postApprovalFulfillment?: { status?: string } }
    }
  }

  if (raw.disbursementDeferred === true || raw.approval?.disbursementDeferred === true) {
    return false
  }

  const pafStatus = String(
    application.postApprovalFulfillment?.status ||
      raw.approval?.postApprovalFulfillment?.status ||
      raw.contractSnapshot?.approval?.postApprovalFulfillment?.status ||
      '',
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (pafStatus === 'disbursed' || pafStatus === 'loan_disbursed') return true
  if (pafStatus.includes('disbursed') && !pafStatus.includes('awaiting')) return true
  if (application.postApprovalFulfillment?.disbursedAt) return true

  const scheduleSource = String(
    (application.amortizationSchedule as { source?: string } | undefined)?.source || '',
  ).toLowerCase()
  if (scheduleSource === 'confirmed') return true

  const status = String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const workflow = String(application.loanWorkflowStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (status.includes('disbursed') && !status.includes('awaiting')) return true
  if (workflow.includes('disbursed') && !workflow.includes('awaiting')) return true

  return false
}

/**
 * Explicit product-wallet balances from list/detail payloads.
 * Returns null when balance fields are omitted (common on list endpoints).
 */
export function explicitProductWalletBalance(application: ProductApplication): number | null {
  const wallet = application.productWallet
  const upstream = wallet?.upstreamAccount
  const value = pickFiniteNumber(
    wallet?.mainBalance,
    wallet?.balance,
    upstream?.mainBalance,
    upstream?.balance,
  )
  return value == null ? null : value
}

/**
 * Spendable balance on the product application wallet.
 * Never fall back to `application.amount` — that is the loan/product principal.
 * When list payloads omit wallet balances, fall back to approval.wallet for disbursed apps only.
 */
export function productWalletAvailableBalance(application: ProductApplication): number {
  const explicit = explicitProductWalletBalance(application)
  if (explicit != null) return explicit

  if (!isApplicationDisbursedForWallet(application)) return 0

  const approved = approvalWallet(application)
  return (
    pickFiniteNumber(approved?.mainBalance, approved?.balance, approved?.ledgerBalance) ?? 0
  )
}

export function canTransferProductWalletToPrimary(
  application: ProductApplication,
  options?: { allowCommodity?: boolean },
): boolean {
  const type = String(application.productType || '').toUpperCase()
  if (!options?.allowCommodity && type === 'COMMODITY') return false
  if (!application.id) return false

  const status = String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  if (
    status.includes('reject') ||
    status.includes('cancel') ||
    status.includes('pending') ||
    status.includes('draft')
  ) {
    return false
  }

  // Loans/mortgages must be disbursed before transfer is available.
  if ((type === 'LOAN' || type === 'MORTGAGE') && !isApplicationDisbursedForWallet(application)) {
    return false
  }

  return productWalletAvailableBalance(application) > 0
}

/**
 * Show the disabled "Transferred to primary wallet" state only when funds were
 * disbursed and the spendable balance is now zero — never for deferred/undisbursed loans.
 */
export function shouldShowTransferredToPrimary(application: ProductApplication): boolean {
  const type = String(application.productType || '').toUpperCase()
  if (type === 'COMMODITY') return false

  const status = String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
  if (
    status.includes('reject') ||
    status.includes('cancel') ||
    status.includes('pending') ||
    status.includes('draft')
  ) {
    return false
  }

  if (type === 'LOAN' || type === 'MORTGAGE') {
    if (!isApplicationDisbursedForWallet(application)) return false
  }

  if (canTransferProductWalletToPrimary(application)) return false
  return productWalletAvailableBalance(application) <= 0
}

/** Clear product-wallet balances after a successful transfer-to-primary. */
export function withZeroProductWallet(
  application: ProductApplication,
  applicationId: string,
): ProductApplication {
  if (application.id !== applicationId) return application
  const wallet = application.productWallet
  const upstream = wallet?.upstreamAccount
  const raw = application as ProductApplication & {
    approval?: { wallet?: Record<string, unknown> }
  }
  const nextApproval = raw.approval
    ? {
        ...raw.approval,
        wallet: {
          ...(asRecord(raw.approval.wallet) || {}),
          balance: 0,
          mainBalance: 0,
          ledgerBalance: 0,
        },
      }
    : raw.approval

  return {
    ...application,
    ...(nextApproval ? { approval: nextApproval } : {}),
    productWallet: {
      ...wallet,
      balance: 0,
      mainBalance: 0,
      upstreamAccount: upstream
        ? {
            ...upstream,
            balance: 0,
            mainBalance: 0,
          }
        : upstream,
    },
  } as ProductApplication
}
