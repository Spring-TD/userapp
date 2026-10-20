'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy mock PIN flow — redirect into the real password-change OTP step. */
export default function NewPinRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/mobile-v2/profile/reset-password')
  }, [router])
  return null
}
