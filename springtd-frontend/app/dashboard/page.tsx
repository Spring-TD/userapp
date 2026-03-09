"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the all-apps page by default (app-first approach)
    router.replace("/dashboard/create-app/all-apps")
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9A813F] mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  )
}
