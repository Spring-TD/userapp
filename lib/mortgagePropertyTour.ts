import type { MobileProduct, ProductProperty } from '@/lib/storefrontProducts'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'

export type PropertyTourData = {
  propertyName: string
  address: string
  mapQuery: string
  hasConfiguredAddress: boolean
  /** YouTube (or other) embeddable URL for the iframe, or null when unavailable. */
  videoUrl: string | null
  /** Original watch/share URL for “open externally” if needed. */
  videoSourceUrl: string | null
  images: string[]
}

/** True when the URL is a direct playable media file (use <video>, not a YouTube iframe). */
export function isDirectVideoMediaUrl(raw: string | null | undefined): boolean {
  const input = String(raw || '').trim()
  if (!input) return false
  if (/\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i.test(input)) return true
  // Common CDN patterns (Cloudinary, Mux, etc.)
  if (/\/video\/upload\//i.test(input)) return true
  if (/cloudinary\.com\/.*\/video\//i.test(input)) return true
  return false
}

function youtubeEmbedFromId(id: string, extraParams?: URLSearchParams): string {
  const params = new URLSearchParams(extraParams)
  if (!params.has('playsinline')) params.set('playsinline', '1')
  if (!params.has('rel')) params.set('rel', '0')
  const qs = params.toString()
  // nocookie + clean embed reduces Error 153 / blocked playback in mobile WebViews.
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}${qs ? `?${qs}` : ''}`
}

/**
 * Convert common YouTube watch/share/shorts URLs into an embeddable iframe src.
 * Returns null when the URL is empty or cannot be normalized.
 */
export function toYoutubeEmbedUrl(raw: string | null | undefined): string | null {
  const input = String(raw || '').trim()
  if (!input) return null

  // Direct files are not YouTube embeds — caller should use <video>.
  if (isDirectVideoMediaUrl(input)) return input

  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? youtubeEmbedFromId(id) : null
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/').filter(Boolean)[1]
        return id ? youtubeEmbedFromId(id, url.searchParams) : null
      }
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.split('/').filter(Boolean)[1]
        return id ? youtubeEmbedFromId(id) : null
      }
      if (url.pathname.startsWith('/live/')) {
        const id = url.pathname.split('/').filter(Boolean)[1]
        return id ? youtubeEmbedFromId(id) : null
      }
      const id = url.searchParams.get('v')
      if (id) return youtubeEmbedFromId(id)
    }
  } catch {
    /* not a parseable URL — fall through */
  }

  const embedMatch = input.match(/(?:youtube(?:-nocookie)?\.com)\/embed\/([A-Za-z0-9_-]{6,})/i)
  if (embedMatch?.[1]) return youtubeEmbedFromId(embedMatch[1])

  // Non-YouTube http(s) URL — pass through (iframe hosts that allow embedding).
  if (/^https?:\/\//i.test(input)) return input

  return null
}

function pickProperty(
  product: MobileProduct | null,
  application: StorefrontApplication,
): ProductProperty | undefined {
  const properties = product?.properties
  if (!Array.isArray(properties) || properties.length === 0) return undefined

  const selection =
    application.mortgageSelection && typeof application.mortgageSelection === 'object'
      ? (application.mortgageSelection as Record<string, unknown>)
      : null
  const selectedName =
    typeof selection?.propertyName === 'string' ? selection.propertyName.trim() : ''
  if (selectedName) {
    const match = properties.find((p) => String(p.name || '').trim() === selectedName)
    if (match) return match
  }

  return properties[0]
}

function resolveAddress(
  property: ProductProperty | undefined,
  application: StorefrontApplication,
): string {
  const fromProperty = property?.location?.trim()
  if (fromProperty) return fromProperty

  const meta = application.metadata
  if (meta && typeof meta === 'object') {
    const address = (meta as Record<string, unknown>).propertyAddress
    if (typeof address === 'string' && address.trim()) return address.trim()
  }

  return ''
}

export function resolveMortgagePropertyHeroImage(
  product: MobileProduct | null | undefined,
  application?: StorefrontApplication | null,
): string | null {
  const tour = buildPropertyTourData(
    product ?? null,
    (application ?? {}) as StorefrontApplication,
  )
  return tour.images[0]?.trim() || product?.image?.trim() || null
}

export function buildPropertyTourData(
  product: MobileProduct | null,
  application: StorefrontApplication,
): PropertyTourData {
  const property = pickProperty(product, application)
  const propertyName =
    property?.name?.trim() || product?.name || application.productName || 'Property'
  const address = resolveAddress(property, application)

  const propertyImages = Array.isArray(property?.imageUrls)
    ? property!.imageUrls!.filter((src) => Boolean(src && String(src).trim()))
    : []
  const images = [
    ...propertyImages,
    ...(product?.image ? [product.image] : []),
  ].filter((src, index, all) => Boolean(src?.trim()) && all.indexOf(src) === index)

  const videoSourceUrl =
    property?.videoUrl?.trim() ||
    (typeof product?.image === 'string' && /youtu(\.be|be\.com)/i.test(product.image)
      ? product.image.trim()
      : '') ||
    null

  return {
    propertyName,
    address: address || 'Property address not configured for this mortgage product.',
    mapQuery: encodeURIComponent(address || propertyName),
    hasConfiguredAddress: Boolean(address),
    videoUrl: toYoutubeEmbedUrl(videoSourceUrl),
    videoSourceUrl,
    images,
  }
}

export function googleMapsUrl(mapQuery: string) {
  return `https://www.google.com/maps/search/?api=1&query=${mapQuery}`
}

/** @deprecated Google embed is often blocked by CSP / X-Frame options — prefer OpenStreetMap. */
export function googleMapsEmbedUrl(mapQuery: string) {
  return `https://maps.google.com/maps?q=${mapQuery}&hl=en&z=14&output=embed`
}

export type GeocodedMapLocation = {
  lat: number
  lon: number
  displayName: string
}

/** Resolve an address to coordinates via OpenStreetMap Nominatim. */
export async function geocodeAddress(address: string): Promise<GeocodedMapLocation | null> {
  const query = String(address || '').trim()
  if (!query) return null

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('q', query)

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const rows = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
    const first = Array.isArray(rows) ? rows[0] : null
    if (!first?.lat || !first?.lon) return null
    const lat = Number(first.lat)
    const lon = Number(first.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return {
      lat,
      lon,
      displayName: String(first.display_name || query),
    }
  } catch {
    return null
  }
}

/** OpenStreetMap embed URL around a lat/lon point. */
export function openStreetMapEmbedUrl(lat: number, lon: number, zoomDelta = 0.04) {
  const delta = zoomDelta
  const left = lon - delta
  const right = lon + delta
  const top = lat + delta
  const bottom = lat - delta
  const bbox = encodeURIComponent(`${left},${bottom},${right},${top}`)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`
}
