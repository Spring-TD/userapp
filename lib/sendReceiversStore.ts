export type SendDestinationType = "bank" | "mobile_money" | "raenest_tag"

export type SavedReceiverBase = {
  id: string
  createdAt: string
  label: string
  type: SendDestinationType
}

export type SavedBankReceiver = SavedReceiverBase & {
  type: "bank"
  currency: string
  bankName: string
  accountNumber: string
  accountName: string
}

export type SavedMobileMoneyReceiver = SavedReceiverBase & {
  type: "mobile_money"
  providerName: string
  phoneNumber: string
  accountName?: string
}

export type SavedRaenestTagReceiver = SavedReceiverBase & {
  type: "raenest_tag"
  tag: string
}

export type SavedReceiver = SavedBankReceiver | SavedMobileMoneyReceiver | SavedRaenestTagReceiver

type DistributiveOmit<T, K extends PropertyKey> = T extends any ? Omit<T, K> : never

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function storageKey(opts: { appId?: string | null; userId?: string | null }) {
  const app = (opts.appId || "no-app").trim()
  const user = (opts.userId || "no-user").trim()
  return `mobile-v2:sendReceivers:${app}:${user}`
}

function randomId(): string {
  // good enough for client-only saved receivers
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getSavedReceivers(opts: { appId?: string | null; userId?: string | null }): SavedReceiver[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(storageKey(opts))
  const parsed = safeJsonParse<unknown>(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(Boolean) as SavedReceiver[]
}

export function saveReceiver(
  opts: { appId?: string | null; userId?: string | null },
  receiver: DistributiveOmit<SavedReceiver, "id" | "createdAt">,
): SavedReceiver {
  const next: SavedReceiver = {
    ...(receiver as SavedReceiver),
    id: randomId(),
    createdAt: new Date().toISOString(),
  }
  const existing = getSavedReceivers(opts)
  const merged = [next, ...existing]
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(opts), JSON.stringify(merged))
  }
  return next
}

export function deleteReceiver(opts: { appId?: string | null; userId?: string | null }, id: string) {
  const existing = getSavedReceivers(opts)
  const filtered = existing.filter((r) => r.id !== id)
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(opts), JSON.stringify(filtered))
  }
}

