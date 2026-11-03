/**
 * Retail KYC onboarding (Prembly) — account-ms `/api/v1/kyc/onboarding/*` via the same-origin BFF.
 * Every call returns the same progress envelope; the UI is driven from `currentStep`.
 * Do not use `/kyc/modular/*` (410).
 */
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { getAccessToken } from '@/lib/cookieAuth'
import { attachTenantHeaders } from '@/lib/tenantRequestHeaders'

/**
 * WhatsApp phone OTP. account-ms currently skips it (`contacts/sync` with the number alone completes the
 * phone step). Flip to true when backend re-enables `purpose=phone-verification` OTP.
 */
export const PHONE_OTP_ENABLED = false

export type OnboardingStep = 'contacts' | 'identity_bvn' | 'identity_nin' | 'face' | 'address' | 'done'

export type OnboardingProgress = {
  level: 1 | 2 | 3
  currentStep: OnboardingStep
  steps: {
    phoneVerified?: boolean
    emailVerified?: boolean
    bvnVerified?: boolean
    ninVerified?: boolean
    faceVerified?: boolean
    addressVerified?: boolean
    proofUploaded?: boolean
  }
  /** Each 0–1 (normalised from 0–100 if the server sends percentages). */
  segments: { contacts: number; identity: number; face: number; address: number }
  capabilities: {
    browseCatalog?: boolean
    fundWallet?: boolean
    sendMoney?: boolean
    applyLoansMortgages?: boolean
    higherLimits?: boolean
  }
  kycStatus?: string
  kycCompleted?: boolean
  levelUnlocked?: number
  /** Running points total, and points granted by the call that returned this progress. */
  points: number
  pointsAwardedJustNow: number
  /** Raw `data` object, for step-specific extras (face URL, BVN name, …). */
  raw: Record<string, unknown>
}

export class OnboardingApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'OnboardingApiError'
    this.status = status
    this.code = code
  }
}

const STEPS: OnboardingStep[] = ['contacts', 'identity_bvn', 'identity_nin', 'face', 'address', 'done']

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function unit(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0
  const f = n > 1 ? n / 100 : n
  return Math.max(0, Math.min(1, f))
}

export function normalizeProgress(data: unknown): OnboardingProgress {
  const d = asRecord(data)
  const steps = asRecord(d.steps) as OnboardingProgress['steps']
  const seg = asRecord(d.segments)
  const lvl = Number(d.level)
  const step = STEPS.includes(d.currentStep as OnboardingStep) ? (d.currentStep as OnboardingStep) : 'contacts'
  return {
    level: lvl === 3 ? 3 : lvl === 2 ? 2 : 1,
    currentStep: d.kycCompleted === true ? 'done' : step,
    steps,
    segments: {
      contacts: unit(seg.contacts),
      identity: unit(seg.identity),
      face: unit(seg.face),
      address: unit(seg.address),
    },
    capabilities: asRecord(d.capabilities) as OnboardingProgress['capabilities'],
    kycStatus: typeof d.kycStatus === 'string' ? d.kycStatus : undefined,
    kycCompleted: d.kycCompleted === true,
    levelUnlocked: typeof d.levelUnlocked === 'number' ? d.levelUnlocked : undefined,
    points: typeof d.points === 'number' ? d.points : 0,
    pointsAwardedJustNow: typeof d.pointsAwardedJustNow === 'number' ? d.pointsAwardedJustNow : 0,
    raw: d,
  }
}

/** Depth-first search for the first non-empty string under any of `keys`. */
export function deepPickString(source: unknown, keys: string[], depth = 4): string | null {
  if (depth < 0 || !source || typeof source !== 'object') return null
  const rec = source as Record<string, unknown>
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === 'object') {
      const hit = deepPickString(v, keys, depth - 1)
      if (hit) return hit
    }
  }
  return null
}

function friendlyError(message: string, status: number): string {
  if (/fetch failed|timed out|timeout|network|econn/i.test(message)) {
    return 'Could not reach the verification service. Check your connection and try again.'
  }
  if (status >= 500 && !message) return 'Verification service is having trouble. Please try again shortly.'
  return message || 'Something went wrong. Please try again.'
}

async function call(path: string, init: RequestInit = {}): Promise<{ progress: OnboardingProgress; json: Record<string, unknown> }> {
  let res: Response
  try {
    res = await fetchWithAuth(`/api/v1/kyc/onboarding${path}`, init)
  } catch (err) {
    throw new OnboardingApiError(friendlyError(err instanceof Error ? err.message : '', 0), 0)
  }
  const json = asRecord(await res.json().catch(() => ({})))
  if (!res.ok || json.success === false) {
    const msg = [json.message, json.error].find((m) => typeof m === 'string' && m.trim()) as string | undefined
    throw new OnboardingApiError(
      friendlyError(msg?.trim() ?? '', res.status),
      res.status,
      typeof json.code === 'string' ? json.code : undefined,
    )
  }
  return { progress: normalizeProgress(json.data), json }
}

const postJson = (path: string, body: Record<string, unknown> = {}) =>
  call(path, { method: 'POST', body: JSON.stringify(body) })

export const kycOnboarding = {
  get: () => call('', { method: 'GET' }),
  start: () => postJson('/start'),
  syncContacts: (phone: string) => postJson('/contacts/sync', { phone: phone.trim() }),
  verifyBvn: (bvn: string) => postJson('/identity/bvn', { bvn }),
  verifyNin: (nin: string) => postJson('/identity/nin', { nin }),
  startFace: () => postJson('/face/start'),
  completeFace: (providerReference?: string | null) =>
    postJson('/face/complete', providerReference ? { providerReference } : {}),
  saveAddress: (input: { street: string; lga: string; state: string } | { useNinAddress: true }) =>
    postJson('/address', input),
  uploadProof: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return call('/address/proof', { method: 'POST', body: form })
  },
  complete: () => postJson('/complete'),
}

/** Hosted liveness URL + reference from a `face/start` response (shape varies by provider). */
export function pickFaceSession(json: Record<string, unknown>): { url: string | null; reference: string | null } {
  const url = deepPickString(json, ['url', 'hostedUrl', 'verificationUrl', 'verification_url', 'redirectUrl', 'link'])
  return {
    url: url && /^https?:\/\//i.test(url) ? url : null,
    reference: deepPickString(json, ['providerReference', 'provider_reference', 'reference', 'sessionId']),
  }
}

/**
 * Proof-of-address upload with real progress (fetch can't report upload progress, XHR can).
 * Same headers as fetchWithAuth: Bearer + tenant; browser sets the multipart boundary.
 */
export function uploadProofWithProgress(file: File, onProgress: (fraction: number) => void): Promise<OnboardingProgress> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/v1/kyc/onboarding/address/proof')
    xhr.withCredentials = true
    const headers = new Headers()
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    attachTenantHeaders(headers)
    headers.forEach((value, key) => xhr.setRequestHeader(key, value))
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(0.99, e.loaded / e.total))
    }
    xhr.onerror = () => reject(new OnboardingApiError(friendlyError('network', 0), 0))
    xhr.onload = () => {
      let json: Record<string, unknown> = {}
      try {
        json = asRecord(JSON.parse(xhr.responseText || '{}'))
      } catch {
        /* non-JSON body */
      }
      if (xhr.status < 200 || xhr.status >= 300 || json.success === false) {
        const msg = [json.message, json.error].find((m) => typeof m === 'string' && m.trim()) as string | undefined
        reject(new OnboardingApiError(friendlyError(msg?.trim() ?? 'Upload failed.', xhr.status), xhr.status))
        return
      }
      onProgress(1)
      resolve(normalizeProgress(json.data))
    }
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}

/** Address from a NIN lookup response, when the server includes one (used to prefill the address step). */
export function pickNinAddress(json: Record<string, unknown>): { street: string; lga: string; state: string } | null {
  const street = deepPickString(json, ['street', 'addressLine', 'address_line', 'residentialAddress', 'residence_address', 'address'])
  const lga = deepPickString(json, ['lga', 'residence_lga', 'lgaOfResidence', 'city', 'town'])
  const state = deepPickString(json, ['state', 'residence_state', 'stateOfResidence'])
  return street && state ? { street, lga: lga ?? '', state } : null
}

export const NIN_ADDRESS_KEY = 'mobile-v2-kyc-nin-address'

/** Name returned by BVN/NIN lookups, when the server includes one. */
export function pickVerifiedName(json: Record<string, unknown>): string | null {
  const full = deepPickString(json, ['fullName', 'full_name', 'name'])
  if (full) return full
  const first = deepPickString(json, ['firstName', 'first_name', 'firstname'])
  const last = deepPickString(json, ['lastName', 'last_name', 'surname', 'lastname'])
  return [first, last].filter(Boolean).join(' ') || null
}

export const FACE_REFERENCE_KEY = 'mobile-v2-kyc-face-reference'

export function storeFaceReference(ref: string | null) {
  try {
    if (ref) sessionStorage.setItem(FACE_REFERENCE_KEY, ref)
    else sessionStorage.removeItem(FACE_REFERENCE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function readFaceReference(): string | null {
  try {
    return sessionStorage.getItem(FACE_REFERENCE_KEY)
  } catch {
    return null
  }
}

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara',
] as const
