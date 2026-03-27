"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function WalletsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/merchant/wallets/settlement")
  }, [router])

  return null
}
