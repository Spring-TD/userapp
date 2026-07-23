import { sanitizeProductId } from '@/lib/sanitizeProductId'
import {
  getExistingInitializedApplication,
  getProductApplicationInitStatus,
  readInitializedApplication,
  saveInitializedApplication,
  type StorefrontApplication,
} from '@/lib/storefrontApplicationClient'

export type ResolvedProductAccount = {
  hasAccount: boolean
  /** True when NUBAN/provision is live (ACTIVE + account number) — required before loan/mortgage apply. */
  isActiveAccount: boolean
  provisionStatus?: string
  applicationId?: string
  application?: StorefrontApplication
}

function normalizeStatusToken(status?: string | null): string {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
}

function upstreamAccountOf(application: StorefrontApplication) {
  return application.productWallet?.upstreamAccount ?? application.account ?? null
}

function applicationHasUpstreamAccount(application: StorefrontApplication): boolean {
  const account = upstreamAccountOf(application)
  return Boolean(account?.accountNumber || account?.accountId || account?.provisionStatus)
}

/**
 * Active = backend provisioned a usable product account (not just ACCOUNT_REQUESTED).
 * Prefer `productWallet.upstreamAccount` when present; otherwise treat as not active.
 * Note: many ACCOUNT REQUESTED rows have no productWallet at all — only
 * `loanWorkflowStatus: "account_requested"` + `upstreamSyncError`.
 */
export function isActiveUpstreamAccount(application: StorefrontApplication | null | undefined): boolean {
  if (!application) return false

  const workflow = normalizeStatusToken(application.loanWorkflowStatus)
  if (workflow.includes('account requested') || workflow === 'requested') {
    // Workflow still says not provisioned — even if a partial wallet object exists.
    const account = upstreamAccountOf(application)
    if (!account?.accountNumber?.trim()) return false
  }

  const account = upstreamAccountOf(application)
  if (!account) return false

  const provision = normalizeStatusToken(account.provisionStatus)
  if (provision.includes('account requested') || provision === 'requested') return false
  if (provision.includes('pending') && !provision.includes('active')) return false
  if (account.accountNumber?.trim()) return true
  if (/\bactive\b/.test(provision)) return true
  return false
}

function isReusableApplication(application: StorefrontApplication, productId: string): boolean {
  const normalizedProductId = sanitizeProductId(productId)
  const applicationProductId = sanitizeProductId(application.productId)
  if (applicationProductId !== normalizedProductId) return false

  const status = String(application.status || '').toUpperCase()
  const workflowStatus = String(application.loanWorkflowStatus || '').toLowerCase()

  return (
    status === 'PENDING' &&
    (workflowStatus === 'account_created' || applicationHasUpstreamAccount(application))
  )
}

function toResolved(application: StorefrontApplication): ResolvedProductAccount {
  const account = upstreamAccountOf(application)
  return {
    hasAccount: true,
    isActiveAccount: isActiveUpstreamAccount(application),
    provisionStatus: account?.provisionStatus ? String(account.provisionStatus) : undefined,
    applicationId: String(application.id ?? application._id ?? ''),
    application,
  }
}

/** One account per user + product (+ merchant). Avoids duplicate account creation prompts. */
export async function resolveProductApplicationAccount(
  userId: string,
  productId: string,
): Promise<ResolvedProductAccount> {
  const normalizedProductId = sanitizeProductId(productId)
  if (!userId || !normalizedProductId) {
    return { hasAccount: false, isActiveAccount: false }
  }

  const cached = readInitializedApplication()
  if (cached && isReusableApplication(cached, normalizedProductId)) {
    return toResolved(cached)
  }

  try {
    const statusRes = await getProductApplicationInitStatus(userId, normalizedProductId)
    if (statusRes.ok && statusRes.status) {
      const hasAccount = Boolean(
        statusRes.status.hasInitializedApplication || statusRes.status.hasUpstreamAccount,
      )
      if (hasAccount && statusRes.status.application) {
        saveInitializedApplication(statusRes.status.application)
        return toResolved(statusRes.status.application)
      }
      if (hasAccount) {
        return { hasAccount: true, isActiveAccount: false }
      }
    }
  } catch {
    // init-status may be unavailable; fall through to list lookup
  }

  const existing = await getExistingInitializedApplication(userId, normalizedProductId)
  if (existing.ok && existing.application) {
    return toResolved(existing.application)
  }

  return { hasAccount: false, isActiveAccount: false }
}

export function isDuplicateAccountError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already') &&
    (m.includes('account') || m.includes('application') || m.includes('initialized'))
  )
}

export function pendingAccountMessage(productLabel = 'product'): string {
  return `Your ${productLabel} account is still being set up (not Active yet). You can apply once provisioning completes and the account shows as Active.`
}
