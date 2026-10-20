type OptionItem = {
  value?: string | number
  label?: string
}

type OptionResponse = {
  data?: OptionItem[]
}

type QueryParams = Record<string, string | number | boolean | undefined | null>

const buildUrl = (basePath: string, query?: QueryParams) => {
  if (!query) return basePath
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  })
  const queryString = params.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

/**
 * Fetches an option list from frontend proxy route:
 * /api/configurations/options/:optionName
 */
export async function fetchOptionLabels(optionName: string, fallback: string[] = []): Promise<string[]> {
  try {
    const res = await fetch(`/api/configurations/options/${encodeURIComponent(optionName)}`, {
      credentials: "include",
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as OptionResponse
    const list = (json?.data ?? []) as OptionItem[]
    const mapped =
      Array.isArray(list) && list.length
        ? list
            .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        : []
    return mapped.length ? mapped : fallback
  } catch {
    return fallback
  }
}

/**
 * Fetches an option list from frontend proxy route:
 * /api/v1/products/options/:optionName
 */
export async function fetchProductOptionLabels(
  optionName: string,
  fallback: string[] = [],
  query?: QueryParams,
): Promise<string[]> {
  try {
    const url = buildUrl(`/api/v1/products/options/${encodeURIComponent(optionName)}`, query)
    const res = await fetch(url, { credentials: "include", cache: "no-store" })
    const json = (await res.json().catch(() => ({}))) as OptionResponse
    const list = (json?.data ?? []) as OptionItem[]
    const mapped =
      Array.isArray(list) && list.length
        ? list
            .map((x) => x.label || (x.value !== undefined && x.value !== null ? String(x.value) : ""))
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        : []
    return mapped.length ? mapped : fallback
  } catch {
    return fallback
  }
}
