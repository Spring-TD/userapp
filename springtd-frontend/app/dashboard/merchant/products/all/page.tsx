"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProductsListPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/dashboard/merchant/products/all/mortgage")
  }, [router])

  return null
}
