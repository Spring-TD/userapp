"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import MerchantSidebar from "@/components/merchant-sidebar"
import MerchantAppsSidebar from "@/components/merchant-apps-sidebar"
import MerchantHeader from "@/components/merchant-header"
import { MerchantComplianceGate, MerchantComplianceProvider } from "@/contexts/MerchantComplianceContext"
import { DashboardTopRightControls } from "@/components/dashboard-top-right-controls"

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Only show MerchantAppsSidebar for exact main dashboard pages
  const isAppsSidebarPage = [
    "/dashboard/merchant",
    "/dashboard/merchant/admin",
    "/dashboard/merchant/compliance",
    "/dashboard/merchant/developer",
    "/dashboard/merchant/settings"
  ].includes(pathname)

  let breadcrumb: React.ReactNode = ""

  if (pathname.includes("/products/active")) {
    breadcrumb = (
      <>
        <Link href="/dashboard/merchant/products/active" className="text-gray-500 font-medium hover:text-gray-900 transition-colors">All Products</Link>
        <span className="text-gray-400 mx-2">/</span>
        <Link href="/dashboard/merchant/products/active" className="text-gray-900 font-bold hover:text-gray-700 transition-colors">Overview</Link>
      </>
    )
  }
  // </CHANGE>

  return (
    <MerchantComplianceProvider>
      <MerchantComplianceGate>
        <div className="flex h-screen bg-gray-50">
          {isAppsSidebarPage ? <MerchantAppsSidebar /> : <MerchantSidebar />}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isAppsSidebarPage ? (
              <header className="h-20 border-b border-gray-200 bg-white flex items-center justify-end px-8">
                <DashboardTopRightControls iconClassName="text-gray-500" />
              </header>
            ) : (
              <MerchantHeader breadcrumb={breadcrumb || undefined} />
            )}
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </MerchantComplianceGate>
    </MerchantComplianceProvider>
  )
}
