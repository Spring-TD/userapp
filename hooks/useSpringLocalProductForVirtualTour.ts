'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { StorefrontApplication } from '@/lib/storefrontApplicationClient'
import {
  fetchSpringLocalProductForVirtualTour,
  resolveSpringLocalProductLookup,
} from '@/lib/springLocalProduct'
import type { MobileProduct } from '@/lib/storefrontProducts'

type Options = {
  application: StorefrontApplication
  enabled?: boolean
}

/**
 * Loads Spring local product detail for mortgage virtual inspection
 * (`properties[].videoUrl` / `imageUrls` / `location`).
 */
export function useSpringLocalProductForVirtualTour({ application, enabled = true }: Options) {
  const applicationRef = useRef(application)
  applicationRef.current = application

  const lookupKey = useMemo(() => {
    const lookup = resolveSpringLocalProductLookup(application)
    return [
      lookup.localProductId,
      lookup.upstreamProductId,
      lookup.appId,
      lookup.candidateIds.join(','),
    ].join('|')
  }, [application])

  const [product, setProduct] = useState<MobileProduct | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const fetchProduct = useCallback(async () => {
    if (!enabled) {
      setProduct(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const mapped = await fetchSpringLocalProductForVirtualTour(applicationRef.current)
      setProduct(mapped)
      if (!mapped) {
        setError('Could not load Spring product detail for this application.')
      }
    } catch (err) {
      console.error('Error fetching Spring local product for virtual tour:', err)
      setProduct(null)
      setError(err instanceof Error ? err.message : 'Failed to fetch product detail')
    } finally {
      setLoading(false)
    }
  }, [enabled, lookupKey])

  useEffect(() => {
    void fetchProduct()
  }, [fetchProduct])

  return { product, loading, error, refetch: fetchProduct }
}
