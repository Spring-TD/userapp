import type { MobileProduct } from '@/lib/storefrontProducts'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'

export type PropertyTourData = {
  propertyName: string
  address: string
  mapQuery: string
  videoUrl: string | null
  images: string[]
}

const DEFAULT_ADDRESS = '28 Kayode Dayo Street, Gwagwalada, Isheri Opic, Ogun State'

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
]

export function buildPropertyTourData(
  product: MobileProduct | null,
  application: StorefrontApplication,
): PropertyTourData {
  const property = product?.properties?.[0]
  const propertyName = property?.name || product?.name || application.productName || 'Property'
  const address =
    property?.location?.trim() ||
    (typeof application.metadata === 'object' &&
    application.metadata &&
    typeof (application.metadata as Record<string, unknown>).propertyAddress === 'string'
      ? String((application.metadata as Record<string, unknown>).propertyAddress)
      : '') ||
    DEFAULT_ADDRESS

  const images = [
    product?.image,
    ...PLACEHOLDER_IMAGES,
  ].filter((src): src is string => Boolean(src && src.trim()))

  const videoUrl =
    typeof product?.image === 'string' && product.image.includes('youtube')
      ? product.image
      : null

  return {
    propertyName,
    address,
    mapQuery: encodeURIComponent(address),
    videoUrl,
    images: images.length > 0 ? images : PLACEHOLDER_IMAGES,
  }
}

export function googleMapsUrl(mapQuery: string) {
  return `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
}

export function googleMapsEmbedUrl(mapQuery: string) {
  return `https://www.google.com/maps?q=${mapQuery}&output=embed`
}
