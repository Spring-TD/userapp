import { BACKEND } from '@/lib/endpoints'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

export const PASSWORD_CHANGE_DRAFT_KEY = 'mobile_v2_password_change_draft'

export type PasswordChangeDraft = {
  currentPassword: string
  newPassword: string
}

type ApiEnvelope = {
  success?: boolean
  message?: string
  error?: string
}

function errorFromBody(data: ApiEnvelope, fallback: string): string {
  return data.error || data.message || fallback
}

export function savePasswordChangeDraft(draft: PasswordChangeDraft) {
  try {
    sessionStorage.setItem(PASSWORD_CHANGE_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function readPasswordChangeDraft(): PasswordChangeDraft | null {
  try {
    const raw = sessionStorage.getItem(PASSWORD_CHANGE_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PasswordChangeDraft
    if (!parsed?.currentPassword || !parsed?.newPassword) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPasswordChangeDraft() {
  try {
    sessionStorage.removeItem(PASSWORD_CHANGE_DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/** POST /api/v1/password/change/request-otp — Bearer. */
export async function requestPasswordChangeOtp(): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetchWithAuth(BACKEND.password.changeRequestOtp, { method: 'POST' })
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope
  if (!res.ok || data.success === false) {
    return { ok: false, error: errorFromBody(data, `Could not send verification code (${res.status})`) }
  }
  return { ok: true }
}

/** PUT /api/v1/password/change — Bearer. */
export async function changePasswordWithOtp(input: {
  currentPassword: string
  newPassword: string
  code: string
}): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  const res = await fetchWithAuth(BACKEND.password.change, {
    method: 'PUT',
    body: JSON.stringify({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      code: input.code,
    }),
  })
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope
  if (!res.ok || data.success === false) {
    return { ok: false, error: errorFromBody(data, `Could not change password (${res.status})`) }
  }
  return { ok: true, message: data.message || 'Password updated successfully.' }
}
