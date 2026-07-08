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
  applicationId?: string
  application?: StorefrontApplication
}

function applicationHasUpstreamAccount(application: StorefrontApplication): boolean {
  const account = application.productWallet?.upstreamAccount ?? application.account
  return Boolean(account?.accountNumber || account?.accountId)
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

/** One account per user + product (+ merchant). Avoids duplicate account creation prompts. */
export async function resolveProductApplicationAccount(
  userId: string,
  productId: string,
): Promise<ResolvedProductAccount> {
  const normalizedProductId = sanitizeProductId(productId)
  if (!userId || !normalizedProductId) {
    return { hasAccount: false }
  }

  const cached = readInitializedApplication()
  if (cached && isReusableApplication(cached, normalizedProductId)) {
    return {
      hasAccount: true,
      applicationId: String(cached.id ?? cached._id ?? ''),
      application: cached,
    }
  }

  try {
    const statusRes = await getProductApplicationInitStatus(userId, normalizedProductId)
    if (statusRes.ok && statusRes.status) {
      const hasAccount = Boolean(
        statusRes.status.hasInitializedApplication || statusRes.status.hasUpstreamAccount,
      )
      if (hasAccount && statusRes.status.application) {
        saveInitializedApplication(statusRes.status.application)
        return {
          hasAccount: true,
          applicationId: String(
            statusRes.status.application.id ?? statusRes.status.application._id ?? '',
          ),
          application: statusRes.status.application,
        }
      }
      if (hasAccount) return { hasAccount: true }
    }
  } catch {
    // init-status may be unavailable; fall through to list lookup
  }

  const existing = await getExistingInitializedApplication(userId, normalizedProductId)
  if (existing.ok && existing.application) {
    return {
      hasAccount: true,
      applicationId: String(existing.application.id ?? existing.application._id ?? ''),
      application: existing.application,
    }
  }

  return { hasAccount: false }
}

export function isDuplicateAccountError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already') &&
    (m.includes('account') || m.includes('application') || m.includes('initialized'))
  )
}
