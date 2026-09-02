/**
 * Muted savings card gradients — 160deg two-stop + dark overlay (see SavingsGradientCard).
 * Colors are subdued (not neon/shiny) for Hot Savings catalog and user savings accounts.
 */

export type SavingsGradientStop = { from: string; to: string }

/** Curated palette: dusty purples, blues, greens, warm earth — all mid-saturation. */
export const SAVINGS_GRADIENT_PALETTE: SavingsGradientStop[] = [
  { from: '#5C4EB0', to: '#9A5FAF' },
  { from: '#2F6FB0', to: '#2E9A90' },
  { from: '#9A5A42', to: '#B8844A' },
  { from: '#2A8A62', to: '#6E9E38' },
  { from: '#4A5568', to: '#5B6B8A' },
  { from: '#6B4E71', to: '#8A6B8F' },
  { from: '#3D5A4C', to: '#5C7A6A' },
  { from: '#3A5F7A', to: '#4A7A8C' },
  { from: '#5D4E60', to: '#7A6B7E' },
  { from: '#5A6B52', to: '#7A8B6E' },
  { from: '#4E5282', to: '#6B6F99' },
  { from: '#7A5C4A', to: '#9A7A62' },
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

function gradientClassForIndex(index: number): string {
  const safe = ((index % SAVINGS_GRADIENT_PALETTE.length) + SAVINGS_GRADIENT_PALETTE.length) % SAVINGS_GRADIENT_PALETTE.length
  const { from, to } = SAVINGS_GRADIENT_PALETTE[safe]
  return `bg-[linear-gradient(160deg,${from}_0%,${to}_100%)]`
}

export function savingsGradientClassForKey(key: string): string {
  if (!key.trim()) return gradientClassForIndex(0)
  return gradientClassForIndex(hashString(key.trim()))
}

/** Dark overlay matching Hot Savings cards. */
export const SAVINGS_CARD_OVERLAY_CLASS =
  'pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,28,0.14)_0%,rgba(18,14,28,0.26)_100%)]'

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
  if (!id) return gradientClassForIndex(0)

  const store = readThemeStore()
  if (store[id] != null) {
    return gradientClassForIndex(store[id])
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
  return gradientClassForIndex(idx)
}

/** Resolved gradient for a user savings account (stored random or stable hash fallback). */
export function getSavingsAccountGradientClass(applicationId: string): string {
  const id = applicationId.trim()
  if (!id) return gradientClassForIndex(0)

  const store = readThemeStore()
  if (store[id] != null) {
    return gradientClassForIndex(store[id])
  }
  return savingsGradientClassForKey(id)
}

/** Catalog product cards — stable color from product id. */
export function getSavingsProductGradientClass(productId: string): string {
  return savingsGradientClassForKey(productId)
}
