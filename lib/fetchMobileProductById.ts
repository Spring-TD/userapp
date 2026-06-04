import { apiClient } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { getAccessToken } from '@/lib/cookieAuth'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { mapApiProductToMobileProduct, type MobileProduct } from '@/lib/storefrontProducts'

type ProductDetailResponse = {
  success?: boolean
  data?: unknown
  error?: string
  message?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function extractDetailRow(payload: unknown, productId: string): Record<string, unknown> | null {
  const direct = asRecord(payload)
  if (!direct) return null

  const data = direct.data
  if (Array.isArray(data)) {
    return (
      data
        .map((item) => asRecord(item))
        .find((item) => {
          if (!item) return false
          return [item.id, item._id, item.upstreamProductId, item.productId, item.product_id]
            .some((candidate) => String(candidate ?? '').trim() === productId)
        }) ?? null
    )
  }

  const dataRecord = asRecord(data)
  if (dataRecord) {
    if (Array.isArray(dataRecord.products)) {
      return (
        dataRecord.products
          .map((item) => asRecord(item))
          .find((item) => {
            if (!item) return false
            return [item.id, item._id, item.upstreamProductId, item.productId, item.product_id]
              .some((candidate) => String(candidate ?? '').trim() === productId)
          }) ?? null
      )
    }

    const nestedProduct = asRecord(dataRecord.product)
    return nestedProduct ? { ...nestedProduct, ...dataRecord, product: undefined } : dataRecord
  }

  const nestedProduct = asRecord(direct.product)
  return nestedProduct ? { ...nestedProduct, ...direct, product: undefined } : direct
}

/** Fetches and maps a single storefront product by activation id. */
export async function fetchMobileProductById(productId: string): Promise<MobileProduct | null> {
  const id = sanitizeProductId(productId)
  if (!id) return null

  const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken())
  const res = await apiClient.get<ProductDetailResponse>(ENDPOINTS.products.byId(id), {
    includeAuth: hasToken,
    timeout: 30_000,
  })

  if (!res.data?.success) {
    throw new Error(res.data?.error || res.data?.message || `Failed to fetch product (${res.status})`)
  }

  const row = extractDetailRow(res.data, id)
  return row ? mapApiProductToMobileProduct(row) : null
}
