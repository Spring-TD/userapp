import { apiClient } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { getAccessToken } from '@/lib/cookieAuth'
import { TENANT_APP_ID_STORAGE_KEY } from '@/lib/mobileTenant/storageKeys'
import { sanitizeProductId } from '@/lib/sanitizeProductId'
import { extractDetailRow } from '@/lib/fetchMobileProductById'
import {
  mapApiProductToMobileProduct,
  type MobileProduct,
} from '@/lib/storefrontProducts'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'

const LOG_PREFIX = '[VirtualTour][SpringProduct]'

type ProductApiResponse = {
  success?: boolean
  data?: unknown
  error?: string
  message?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const value of values) {
    const id = sanitizeProductId(value)
    if (id && !out.includes(id)) out.push(id)
  }
  return out
}

function readTenantAppId(): string {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(TENANT_APP_ID_STORAGE_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

/**
 * Prefer Spring **local** product id (clone after turn-on), not only Plata catalog id.
 */
export function resolveSpringLocalProductLookup(application: StorefrontApplication): {
  localProductId: string
  upstreamProductId: string
  appId: string
  candidateIds: string[]
} {
  const meta = asRecord(application.metadata)
  const nestedProduct = asRecord(
    (application as StorefrontApplication & { product?: unknown }).product,
  )

  const localProductId =
    uniqueIds([
      (application as StorefrontApplication & { localProductId?: string }).localProductId,
      (application as StorefrontApplication & { springProductId?: string }).springProductId,
      typeof meta?.localProductId === 'string' ? meta.localProductId : undefined,
      typeof nestedProduct?.id === 'string' ? nestedProduct.id : undefined,
      application.productId,
    ])[0] || ''

  const upstreamProductId =
    uniqueIds([
      (application as StorefrontApplication & { upstreamProductId?: string }).upstreamProductId,
      typeof meta?.upstreamProductId === 'string' ? meta.upstreamProductId : undefined,
      typeof nestedProduct?.upstreamProductId === 'string'
        ? nestedProduct.upstreamProductId
        : undefined,
    ])[0] || ''

  const appId =
    String(application.appId ?? '').trim() ||
    (typeof meta?.appId === 'string' ? meta.appId.trim() : '') ||
    (typeof nestedProduct?.appId === 'string' ? String(nestedProduct.appId).trim() : '') ||
    readTenantAppId()

  const candidateIds = uniqueIds([localProductId, upstreamProductId, application.productId])

  return { localProductId, upstreamProductId, appId, candidateIds }
}

function rowMatchesCandidates(row: Record<string, unknown>, candidateIds: string[]): boolean {
  if (!candidateIds.length) return false
  const rowIds = uniqueIds([
    typeof row.id === 'string' ? row.id : undefined,
    typeof row._id === 'string' ? row._id : undefined,
    typeof row.upstreamProductId === 'string' ? row.upstreamProductId : undefined,
    typeof row.productId === 'string' ? row.productId : undefined,
  ])
  return candidateIds.some((id) => rowIds.includes(id))
}

function extractProductRows(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload)
  if (!root) return []
  const data = root.data ?? root

  if (Array.isArray(data)) {
    return data.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[]
  }

  const dataRecord = asRecord(data)
  if (!dataRecord) return []

  if (Array.isArray(dataRecord.products)) {
    return dataRecord.products
      .map((item) => asRecord(item))
      .filter(Boolean) as Record<string, unknown>[]
  }

  if (dataRecord.id || dataRecord._id || dataRecord.properties) {
    return [dataRecord]
  }

  return []
}

function logPropertyMedia(source: string, product: MobileProduct | null) {
  const properties = product?.properties ?? []
  console.log(`${LOG_PREFIX} mapped product from ${source}`, {
    id: product?.id,
    upstreamProductId: product?.upstreamProductId,
    name: product?.name,
    propertiesCount: properties.length,
    properties: properties.map((p, i) => ({
      index: i,
      name: p.name,
      location: p.location,
      videoUrl: p.videoUrl ?? null,
      imageUrls: p.imageUrls ?? [],
    })),
  })
}

async function fetchProductDetailById(productId: string): Promise<{
  raw: ProductApiResponse | null
  product: MobileProduct | null
  status: number
  path: string
}> {
  const id = sanitizeProductId(productId)
  const path = ENDPOINTS.products.byId(id)
  const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken())

  console.log(`${LOG_PREFIX} REQUEST GET ${path}`, { productId: id, includeAuth: hasToken })

  const res = await apiClient.get<ProductApiResponse>(path, {
    includeAuth: hasToken,
    timeout: 30_000,
  })

  console.log(`${LOG_PREFIX} RESPONSE GET ${path}`, {
    status: res.status,
    success: res.data?.success,
    raw: res.data,
  })

  if (res.data?.success === false || res.status >= 400) {
    return { raw: res.data ?? null, product: null, status: res.status, path }
  }

  const row = extractDetailRow(res.data, id)
  const product = row ? mapApiProductToMobileProduct(row) : null
  logPropertyMedia(`GET ${path}`, product)
  return { raw: res.data ?? null, product, status: res.status, path }
}

async function fetchFromAppCatalog(
  appId: string,
  candidateIds: string[],
): Promise<MobileProduct | null> {
  if (!appId || !candidateIds.length) return null

  const path = ENDPOINTS.products.byAppId(appId)
  const hasToken = typeof window !== 'undefined' && Boolean(getAccessToken())

  console.log(`${LOG_PREFIX} REQUEST GET ${path}`, { appId, candidateIds, includeAuth: hasToken })

  const res = await apiClient.get<ProductApiResponse>(path, {
    includeAuth: hasToken,
    timeout: 30_000,
  })

  console.log(`${LOG_PREFIX} RESPONSE GET ${path}`, {
    status: res.status,
    success: res.data?.success,
    raw: res.data,
  })

  if (res.data?.success === false || res.status >= 400) {
    return null
  }

  const rows = extractProductRows(res.data)
  const match = rows.find((row) => rowMatchesCandidates(row, candidateIds))
  const product = match ? mapApiProductToMobileProduct(match) : null
  logPropertyMedia(`GET ${path} (matched)`, product)
  return product
}

/**
 * Load Spring storefront product for virtual inspection:
 * 1) `GET /api/v1/products/{localProductId}`
 * 2) fallback `GET /api/v1/products/app/{appId}` and match local / upstream id
 *
 * Reads tour media from `product.properties[i].videoUrl`, `imageUrls`, `location`.
 */
export async function fetchSpringLocalProductForVirtualTour(
  application: StorefrontApplication,
): Promise<MobileProduct | null> {
  const lookup = resolveSpringLocalProductLookup(application)
  const { localProductId, candidateIds, appId, upstreamProductId } = lookup

  console.log(`${LOG_PREFIX} starting lookup`, {
    applicationId: application.id ?? application._id,
    applicationProductId: application.productId,
    localProductId,
    upstreamProductId,
    appId,
    candidateIds,
  })

  if (!candidateIds.length && !appId) {
    console.warn(`${LOG_PREFIX} no productId/appId on application — cannot call Spring product endpoint`)
    return null
  }

  // Prefer detail by Spring local id first.
  for (const id of uniqueIds([localProductId, ...candidateIds])) {
    try {
      const { product: detail } = await fetchProductDetailById(id)
      if (detail) {
        const hasPropertyMedia = (detail.properties ?? []).some(
          (p) =>
            Boolean(p.videoUrl?.trim()) ||
            Boolean(p.imageUrls?.length) ||
            Boolean(p.location?.trim()),
        )
        if (hasPropertyMedia || !appId) {
          console.log(`${LOG_PREFIX} using product detail`, { id: detail.id, hasPropertyMedia })
          return detail
        }

        console.log(`${LOG_PREFIX} detail missing media — trying app catalog fallback`)
        const fromCatalog = await fetchFromAppCatalog(appId, candidateIds)
        if (fromCatalog) return fromCatalog
        return detail
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} detail request failed for ${id}`, error)
    }
  }

  if (appId) {
    try {
      const fromCatalog = await fetchFromAppCatalog(appId, candidateIds)
      if (fromCatalog) return fromCatalog
    } catch (error) {
      console.error(`${LOG_PREFIX} app catalog request failed`, error)
    }
  }

  console.warn(`${LOG_PREFIX} no Spring product found for virtual tour`)
  return null
}

/** Re-export helper used when a raw product payload is already available. */
export function mapSpringProductDetailPayload(
  payload: unknown,
  productId: string,
): MobileProduct | null {
  const row = extractDetailRow(payload, productId)
  return row ? mapApiProductToMobileProduct(row) : null
}
