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

/** Live product-application wallet from list/detail aliases — never approval.wallet. */
function liveProductWalletRecord(source: unknown): Record<string, unknown> | null {
  const src = asRecord(source)
  if (!src) return null
  const direct = asRecord(src.productWallet)
  if (direct) return direct
  for (const [key, value] of Object.entries(src)) {
    const lower = key.toLowerCase()
    if (!lower.includes('wallet')) continue
    if (lower.includes('approval')) continue
    const wallet = asRecord(value)
    if (!wallet) continue
    if (
      wallet.balance != null ||
      wallet.mainBalance != null ||
      wallet.upstreamAccount != null ||
      wallet.upstreamAccount != null ||
      wallet.walletId != null ||
      wallet.walletId != null
    ) {
      return wallet
    }
  }
  return null
}

function liveBalanceFromWalletRecord(wallet: Record<string, unknown> | null): number | null {
  if (!wallet) return null
  const upstream =
    asRecord(wallet.upstreamAccount) ||
    asRecord(wallet.upstreamAccount) ||
    asRecord(wallet.upstreamAccount) ||
    null
  const value = pickFiniteNumber(
    wallet.mainBalance,
    wallet.balance,
    upstream?.mainBalance,
    upstream?.balance,
  )
  return value == null ? null : value
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
 * Live product-wallet balances from list/detail payloads.
 * Returns null when balance fields are omitted.
 * Never uses `approval.wallet` — that snapshot is the credit at approval and stays
 * stale after transfer-to-primary.
 */
export function explicitProductWalletBalance(application: ProductApplication): number | null {
  const typed = liveBalanceFromWalletRecord(asRecord(application.productWallet))
  if (typed != null) return typed
  return liveBalanceFromWalletRecord(liveProductWalletRecord(application))
}

/**
 * Spendable balance on the product application wallet.
 * Never fall back to `application.amount` or `approval.wallet`.
 */
export function productWalletAvailableBalance(application: ProductApplication): number {
  return explicitProductWalletBalance(application) ?? 0
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

  const live = explicitProductWalletBalance(application)
  return live != null && live > 0
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
    // List payloads omit live balances and keep a stale approval.wallet credit.
    // No live productWallet balance (or 0) after disburse → already moved to primary.
    return !canTransferProductWalletToPrimary(application)
  }

  if (canTransferProductWalletToPrimary(application)) return false
  const live = explicitProductWalletBalance(application)
  return live != null && live <= 0
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

/**
 * Copy disbursement / schedule signals from a richer detail payload onto a list row.
 * List endpoints often keep top-level status as APPROVED and omit PAF.
 */
export function mergeDisbursementSignals(
  target: ProductApplication,
  source: unknown,
): ProductApplication {
  const src = asRecord(source)
  if (!src) return target

  const srcApproval = asRecord(src.approval)
  const srcContract = asRecord(src.contractSnapshot)
  const srcContractApproval = asRecord(srcContract?.approval)

  const paf =
    asRecord(src.postApprovalFulfillment) ||
    asRecord(srcApproval?.postApprovalFulfillment) ||
    asRecord(srcContractApproval?.postApprovalFulfillment) ||
    null

  const schedule = asRecord(src.amortizationSchedule)
  const workflow =
    typeof src.loanWorkflowStatus === 'string' ? src.loanWorkflowStatus : undefined
  const deferred =
    typeof src.disbursementDeferred === 'boolean'
      ? src.disbursementDeferred
      : typeof srcApproval?.disbursementDeferred === 'boolean'
        ? (srcApproval.disbursementDeferred as boolean)
        : undefined

  const nextApproval =
    srcApproval || target.approval
      ? {
          ...(target.approval || {}),
          ...(srcApproval || {}),
          ...(paf && !asRecord(srcApproval?.postApprovalFulfillment)
            ? { postApprovalFulfillment: paf }
            : {}),
        }
      : target.approval

  return {
    ...target,
    ...(paf
      ? {
          postApprovalFulfillment: {
            ...(target.postApprovalFulfillment || {}),
            status: typeof paf.status === 'string' ? paf.status : target.postApprovalFulfillment?.status,
            disbursedAt:
              typeof paf.disbursedAt === 'string'
                ? paf.disbursedAt
                : target.postApprovalFulfillment?.disbursedAt,
          },
        }
      : {}),
    ...(schedule ? { amortizationSchedule: { ...(target.amortizationSchedule || {}), ...schedule } } : {}),
    ...(workflow ? { loanWorkflowStatus: workflow } : {}),
    ...(deferred !== undefined ? { disbursementDeferred: deferred } : {}),
    ...(nextApproval ? { approval: nextApproval as ProductApplication['approval'] } : {}),
    ...(liveProductWalletRecord(src)
      ? {
          productWallet: {
            ...target.productWallet,
            ...(liveProductWalletRecord(src) as object),
          } as ProductApplication['productWallet'],
        }
      : {}),
  }
}
