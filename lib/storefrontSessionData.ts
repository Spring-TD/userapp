import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { getAccessToken } from "@/lib/cookieAuth"
import { invalidateQueries, queryCache } from "@/lib/sessionQueryCache"
import {
  filterActiveAppProducts,
  mapApiProductToMobileProduct,
  type MobileProduct,
} from "@/lib/storefrontProducts"

export const STOREFRONT_TTL = {
  products: 60_000,
  profile: 60_000,
  wallet: 15_000,
  applications: 20_000,
  branding: 5 * 60_000,
  tenant: 5 * 60_000,
} as const

export function storefrontProductsKey(appId: string) {
  return `storefront:products:${appId}`
}

export function storefrontProfileKey() {
  return "storefront:profile:me"
}

export function storefrontWalletKey(userId: string) {
  return `storefront:wallet:${userId}`
}

export function storefrontApplicationsKey(
  userId: string,
  params?: { productType?: string; appId?: string; status?: string; productId?: string },
) {
  return [
    "storefront:applications",
    userId,
    params?.productType || "",
    params?.appId || "",
    params?.status || "",
    params?.productId || "",
  ].join(":")
}

function extractProductPagination(payload: unknown): { totalPages?: number } | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const obj = payload as Record<string, unknown>
  const from = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
    const p = value as Record<string, unknown>
    if (p.totalPages == null) return undefined
    return {
      totalPages: typeof p.totalPages === "number" ? p.totalPages : Number(p.totalPages) || undefined,
    }
  }
  const inner = obj.data
  return (
    from(obj.pagination) ||
    (inner && typeof inner === "object" && !Array.isArray(inner)
      ? from((inner as Record<string, unknown>).pagination)
      : undefined)
  )
}

function extractProductRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const row = payload as Record<string, unknown>
  if (Array.isArray(row.products)) return row.products
  if (Array.isArray(row.items)) return row.items
  if (Array.isArray(row.rows)) return row.rows
  const nested = row.data
  if (Array.isArray(nested)) return nested
  if (nested && typeof nested === "object") {
    const nestedRow = nested as Record<string, unknown>
    if (Array.isArray(nestedRow.products)) return nestedRow.products
    if (Array.isArray(nestedRow.items)) return nestedRow.items
    if (Array.isArray(nestedRow.rows)) return nestedRow.rows
  }
  return []
}

function parseAppProductIsActive(row: Record<string, unknown>): boolean {
  const value = row.isActive ?? row.active ?? row.enabled
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "active", "enabled", "on"].includes(normalized)) return true
    if (["false", "0", "inactive", "disabled", "off"].includes(normalized)) return false
  }
  return false
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "active", "enabled", "on", "featured"].includes(normalized)) return true
    if (["false", "0", "inactive", "disabled", "off"].includes(normalized)) return false
  }
  return undefined
}

function normalizeAppProductRow(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const nested =
    record.product && typeof record.product === "object"
      ? (record.product as Record<string, unknown>)
      : null

  if (!nested) {
    return {
      ...record,
      id: record.id ?? record._id,
      isActive: parseAppProductIsActive(record),
      isFeatured: parseOptionalBoolean(record.isFeatured ?? record.featured) ?? false,
      upstreamProductId: record.upstreamProductId ?? record.upstream_product_id,
    }
  }

  const localId = record.id ?? record._id
  const upstreamProductId =
    record.upstreamProductId ?? record.upstream_product_id ?? nested.id ?? nested._id

  return {
    ...nested,
    ...record,
    id: localId,
    _id: localId,
    appId: record.appId ?? record.app_id ?? nested.appId ?? nested.app_id,
    isActive: parseAppProductIsActive(record),
    isFeatured:
      parseOptionalBoolean(record.isFeatured ?? record.featured) ??
      parseOptionalBoolean(nested.isFeatured ?? nested.featured) ??
      false,
    upstreamProductId,
    merchant: record.merchant ?? nested.merchant,
    merchantId:
      record.merchantId ??
      record.merchant_id ??
      (record.merchant && typeof record.merchant === "object"
        ? (record.merchant as Record<string, unknown>).id
        : undefined),
    product: undefined,
  }
}

async function fetchStorefrontProductsUncached(appId: string): Promise<MobileProduct[]> {
  const hasToken = typeof window !== "undefined" && Boolean(getAccessToken())
  const first = await apiClient.get<{
    success?: boolean
    data?: unknown
    error?: string
    message?: string
  }>(ENDPOINTS.products.byAppId(appId, { page: 1, limit: 100 }), {
    includeAuth: hasToken,
    timeout: 60_000,
  })

  if (!first.data?.success) {
    throw new Error(first.data?.error || first.data?.message || `Failed to fetch products (${first.status})`)
  }

  const raw = extractProductRows(first.data)
  const pagination = extractProductPagination(first.data)
  const totalPages = pagination?.totalPages && pagination.totalPages > 0 ? pagination.totalPages : 1

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await apiClient.get<{ success?: boolean; data?: unknown }>(
      ENDPOINTS.products.byAppId(appId, { page, limit: 100 }),
      { includeAuth: hasToken, timeout: 60_000 },
    )
    if (next.data?.success) raw.push(...extractProductRows(next.data))
  }

  return filterActiveAppProducts(
    raw
      .map(normalizeAppProductRow)
      .filter(Boolean)
      .map((row) => mapApiProductToMobileProduct(row as Record<string, unknown>))
      .filter(Boolean) as MobileProduct[],
  )
}

export async function loadStorefrontProducts(appId: string, options?: { force?: boolean }) {
  const id = appId.trim()
  if (!id) return [] as MobileProduct[]
  return queryCache(storefrontProductsKey(id), () => fetchStorefrontProductsUncached(id), STOREFRONT_TTL.products, {
    force: options?.force,
  })
}

export function invalidateStorefrontProducts(appId?: string) {
  if (appId) invalidateQueries(storefrontProductsKey(appId))
  else invalidateQueries("storefront:products:")
}

export function invalidateStorefrontWallet(userId?: string) {
  if (userId) invalidateQueries(storefrontWalletKey(userId))
  else invalidateQueries("storefront:wallet:")
}

export function invalidateStorefrontApplications(userId?: string) {
  if (userId) {
    invalidateQueries(`storefront:applications:${userId}`)
    invalidateQueries(`storefront:approved-summary:${userId}`)
  } else {
    invalidateQueries("storefront:applications:")
    invalidateQueries("storefront:approved-summary:")
  }
}

export function invalidateStorefrontProfile() {
  invalidateQueries(storefrontProfileKey())
}

/** Warm catalog + signed-in profile/wallet so later pages reuse the same responses. */
export async function prefetchStorefrontSession(appId: string) {
  const id = appId.trim()
  if (!id) return
  const tasks: Promise<unknown>[] = [loadStorefrontProducts(id)]
  if (typeof window !== "undefined" && getAccessToken()) {
    const { fetchAuthUserProfile } = await import("@/lib/userProfileClient")
    tasks.push(
      fetchAuthUserProfile().then(async (profile) => {
        const userId = profile.user?.id?.trim() || profile.user?._id?.trim()
        if (!userId) return
        const { fetchUserWallet } = await import("@/lib/services/userWalletApi")
        await fetchUserWallet(userId)
      }),
    )
  }
  await Promise.allSettled(tasks)
}
