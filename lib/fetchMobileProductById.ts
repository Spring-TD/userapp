import { apiClient } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { getAccessToken } from '@/lib/cookieAuth'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { TENANT_APP_ID_STORAGE_KEY } from '@/lib/mobileTenant/storageKeys'
import { loadStorefrontProducts } from '@/lib/storefrontSessionData'
import {
  isStorefrontPurchasableProduct,
  mapApiProductToMobileProduct,
  type MobileProduct,
} from '@/lib/storefrontProducts'

type ProductDetailResponse = {
  success?: boolean
  data?: unknown
  error?: string
  message?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function withLocalIds(row: Record<string, unknown>): Record<string, unknown> {
  const nested = asRecord(row.product)
  if (!nested) return row
  return {
    ...nested,
    ...row,
    id: row.id ?? row._id,
    _id: row.id ?? row._id,
    upstreamProductId: row.upstreamProductId ?? row.upstream_product_id ?? nested.id ?? nested._id,
    product: undefined,
  }
}

export function extractDetailRow(payload: unknown, productId: string): Record<string, unknown> | null {
  const direct = asRecord(payload)
  if (!direct) return null

  const data = direct.data
  if (Array.isArray(data)) {
    return (
      data
        .map((item) => asRecord(item))
        .map((item) => (item ? withLocalIds(item) : null))
        .find((item) => {
          if (!item) return false
          return [item.id, item._id, item.upstreamProductId, item.productId, item.product_id]
            .some((candidate) => String(candidate ?? '').trim() === productId)
        }) ?? null
    )
  }

  const dataRecord = asRecord(data)
  if (dataRecord) {
    if (Array.isArray(dataRecord.items) || Array.isArray(dataRecord.products)) {
      const list = (dataRecord.items ?? dataRecord.products) as unknown[]
      return (
        list
          .map((item) => asRecord(item))
          .map((item) => (item ? withLocalIds(item) : null))
          .find((item) => {
            if (!item) return false
            return [item.id, item._id, item.upstreamProductId]
              .some((candidate) => String(candidate ?? '').trim() === productId)
          }) ?? null
      )
    }
    return withLocalIds(dataRecord)
  }

  return withLocalIds(direct)
}

async function fetchTurnedOnAppProduct(productId: string): Promise<MobileProduct | null> {
  const appId =
    typeof window !== 'undefined' ? sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() : ''
  if (!appId) return null

  try {
    const mapped = await loadStorefrontProducts(appId)
    return (
      mapped.find((product) => product.id === productId) ??
      mapped.find((product) => product.upstreamProductId === productId) ??
      null
    )
  } catch {
    return null
  }
}

/** Resolves a storefront product from GET /products/app/:appId (`data.items`) first. */
export async function fetchMobileProductById(productId: string): Promise<MobileProduct | null> {
  const id = sanitizeProductId(productId)
  if (!id) return null

  const fromApp = await fetchTurnedOnAppProduct(id)
  if (fromApp) return fromApp

  const appId =
    typeof window !== 'undefined' ? sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() : ''
  if (appId) return null

  const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken())
  try {
    const res = await apiClient.get<ProductDetailResponse>(ENDPOINTS.products.byId(id), {
      includeAuth: hasToken,
      timeout: 60_000,
    })

    if (res.data?.success) {
      const row = extractDetailRow(res.data, id)
      const mapped = row ? mapApiProductToMobileProduct(row) : null
      if (mapped && isStorefrontPurchasableProduct(mapped)) return mapped
    }
  } catch {
    return null
  }

  return null
}
