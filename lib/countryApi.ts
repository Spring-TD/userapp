/**
 * Country list via same-origin BFF (`/api/countries`).
 * REST Countries v3.1 is deprecated in production; the BFF uses a stable ISO dataset.
 */

export interface CountryOption {
  code: string
  name: string
  /** International dial code (e.g. "+234") */
  dialCode: string
}

let cached: CountryOption[] | null = null
let fetchPromise: Promise<CountryOption[]> | null = null

function normalizeCountryRows(data: unknown): CountryOption[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const r = row as Record<string, unknown>
      const code = String(r.code || "").trim().toLowerCase()
      const name = String(r.name || "").trim()
      const dialCode = String(r.dialCode || "").trim()
      if (!code || !name) return null
      return { code, name, dialCode }
    })
    .filter((c): c is CountryOption => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchCountries(): Promise<CountryOption[]> {
  if (cached?.length) return cached
  if (!fetchPromise) {
    fetchPromise = (async () => {
      const res = await fetch("/api/countries", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch countries")
      const data = await res.json()
      const result = normalizeCountryRows(data)
      if (result.length === 0) throw new Error("No countries available")
      cached = result
      return result
    })()
  }
  return fetchPromise
}

/** Call early (e.g. in root layout) to start loading countries before user opens a dropdown. */
export function preloadCountries(): void {
  if (!cached?.length) void fetchCountries().catch(() => undefined)
}
