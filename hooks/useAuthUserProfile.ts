'use client'

import { useCallback, useEffect, useState } from 'react'

import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient'

export function useAuthUserProfile() {
  const [user, setUser] = useState<AuthUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchAuthUserProfile()
    setUser(result.user)
    setError(result.error)
    setLoading(false)
    return result
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { user, loading, error, refetch }
}
