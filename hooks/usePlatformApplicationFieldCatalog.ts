'use client'

import { useEffect, useState } from 'react'
import {
  fetchPlatformFieldCatalog,
  filterFieldsForProductType,
  loadPlatformSelectOptionsMap,
  type PlatformFieldDefinition,
  type PlatformSelectOption,
} from '@/lib/platformApplicationFields'

export function usePlatformApplicationFieldCatalog(productType: 'LOAN' | 'MORTGAGE') {
  const [fields, setFields] = useState<PlatformFieldDefinition[]>([])
  const [optionsByPath, setOptionsByPath] = useState<Record<string, PlatformSelectOption[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const catalog = await fetchPlatformFieldCatalog()
        const filtered = filterFieldsForProductType(catalog, productType)
        const options = await loadPlatformSelectOptionsMap(filtered)
        if (cancelled) return
        setFields(filtered)
        setOptionsByPath(options)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load application fields.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [productType])

  return { fields, optionsByPath, loading, error }
}
