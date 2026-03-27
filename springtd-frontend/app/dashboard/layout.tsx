"use client"

import type React from "react"
import Sidebar from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isScamAlertPage = pathname?.includes("/scam-alert")
  const isAppDetailsPage = pathname?.match(/\/dashboard\/create-app\/all-apps\/[a-zA-Z0-9]+/)

  const isMerchantPage = pathname?.startsWith("/dashboard/merchant")

  if (isAppDetailsPage || isMerchantPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isScamAlertPage && <DashboardHeader />}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
