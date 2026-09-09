/**
 * Savings card gradients — 160deg two-stop + dark overlay (see SavingsGradientCard).
 * Applied as inline `backgroundImage` so Tailwind does not drop dynamic class names.
 */

export type SavingsGradientStop = { from: string; to: string }

/** Distinct mid-saturation palette for Hot Savings catalog and user savings accounts. */
export const SAVINGS_GRADIENT_PALETTE: SavingsGradientStop[] = [
  { from: '#5C4EB0', to: '#9A5FAF' },
  { from: '#2F6FB0', to: '#2E9A90' },
  { from: '#C45C2A', to: '#D4A017' },
  { from: '#1E8A5A', to: '#6E9E38' },
  { from: '#3B5BDB', to: '#5C7CFA' },
  { from: '#9C3D6E', to: '#C25A8A' },
  { from: '#2B6A4F', to: '#4C9A78' },
  { from: '#1D6A8A', to: '#2F9BB0' },
  { from: '#7B3FA0', to: '#A56BC4' },
  { from: '#3F7A3A', to: '#6AAA4A' },
  { from: '#4E5282', to: '#7480C2' },
  { from: '#B45309', to: '#D97706' },
]

const STORAGE_KEY = 'mobile-v2:savings-account-themes'

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function gradientCssForIndex(index: number): string {
  const safe =
    ((index % SAVINGS_GRADIENT_PALETTE.length) + SAVINGS_GRADIENT_PALETTE.length) %
    SAVINGS_GRADIENT_PALETTE.length
  const { from, to } = SAVINGS_GRADIENT_PALETTE[safe]
  return `linear-gradient(160deg, ${from} 0%, ${to} 100%)`
}

export function savingsGradientClassForKey(key: string): string {
  if (!key.trim()) return gradientCssForIndex(0)
  return gradientCssForIndex(hashString(key.trim()))
}

/** Dark overlay matching Hot Savings cards. */
export const SAVINGS_CARD_OVERLAY_CLASS =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,28,0.08)_0%,rgba(18,14,28,0.18)_100%)]'

function readThemeStore(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

function writeThemeStore(store: Record<string, number>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* quota / private mode */
  }
}

/**
 * Assign a random (unused when possible) palette entry when a savings account is created.
 * Persists per application id so the color stays stable.
 */
export function assignSavingsAccountTheme(applicationId: string): string {
  const id = applicationId.trim()
  if (!id) return gradientCssForIndex(0)

  const store = readThemeStore()
  if (store[id] != null) {
    return gradientCssForIndex(store[id])
  }

  const used = new Set(Object.values(store))
  let idx = Math.floor(Math.random() * SAVINGS_GRADIENT_PALETTE.length)
  let guard = 0
  while (used.has(idx) && guard < SAVINGS_GRADIENT_PALETTE.length) {
    idx = (idx + 1) % SAVINGS_GRADIENT_PALETTE.length
    guard += 1
  }

  store[id] = idx
  writeThemeStore(store)
  return gradientCssForIndex(idx)
}

/** Resolved gradient CSS for a user savings account (stored random or stable hash fallback). */
export function getSavingsAccountGradientClass(applicationId: string): string {
  const id = applicationId.trim()
  if (!id) return gradientCssForIndex(0)

  const store = readThemeStore()
  if (store[id] != null) {
    return gradientCssForIndex(store[id])
  }
  return savingsGradientClassForKey(id)
}

/** Catalog product cards — stable color from product id. */
export function getSavingsProductGradientClass(productId: string): string {
  return savingsGradientClassForKey(productId)
}
