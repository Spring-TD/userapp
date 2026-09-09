'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { isUserKycApprovedFromProfile } from '@/lib/kycApproval'
import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient'

export function useAuthUserProfile() {
  const [user, setUser] = useState<AuthUserProfile | null>(null)
  const [kycStatus, setKycStatus] = useState<string | undefined>()
  const [kycCompleted, setKycCompleted] = useState<boolean | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await fetchAuthUserProfile({ force: true })
    setUser(result.user)
    setKycStatus(result.kycStatus)
    setKycCompleted(result.kycCompleted)
    setError(result.error)
    setLoading(false)
    return result
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const kycApproved = useMemo(
    () => isUserKycApprovedFromProfile(kycStatus, kycCompleted),
    [kycStatus, kycCompleted],
  )

  return { user, kycStatus, kycCompleted, kycApproved, loading, error, refetch }
}
