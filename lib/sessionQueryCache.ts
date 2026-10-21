type CacheEntry<T> = { value: T; expiresAt: number }

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  listeners.get(key)?.forEach((cb) => cb())
}

export function peekQuery<T>(key: string): T | undefined {
  const hit = store.get(key) as CacheEntry<T> | undefined
  if (!hit) return undefined
  if (hit.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return hit.value
}

export function seedQuery<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
  notify(key)
}

export function subscribeQuery(key: string, cb: () => void) {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(cb)
  return () => {
    set.delete(cb)
    if (set.size === 0) listeners.delete(key)
  }
}

export function invalidateQueries(prefix: string) {
  for (const key of [...store.keys()]) {
    if (key === prefix || key.startsWith(prefix)) store.delete(key)
  }
  for (const key of [...inflight.keys()]) {
    if (key === prefix || key.startsWith(prefix)) inflight.delete(key)
  }
  for (const key of [...listeners.keys()]) {
    if (key === prefix || key.startsWith(prefix)) notify(key)
  }
}

export async function queryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  options?: { force?: boolean },
): Promise<T> {
  if (!options?.force) {
    const hit = peekQuery<T>(key)
    if (hit !== undefined) return hit
  }

  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>

  const request = fetcher()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs })
      inflight.delete(key)
      notify(key)
      return value
    })
    .catch((error) => {
      inflight.delete(key)
      throw error
    })

  inflight.set(key, request)
  return request
}
