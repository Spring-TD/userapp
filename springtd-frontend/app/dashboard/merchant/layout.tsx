"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import MerchantSidebar from "@/components/merchant-sidebar"
import MerchantAppsSidebar from "@/components/merchant-apps-sidebar"
import MerchantHeader from "@/components/merchant-header"
import { Bell, User } from "lucide-react"

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
    <div className="flex h-screen bg-gray-50">
      {isAppsSidebarPage ? <MerchantAppsSidebar /> : <MerchantSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isAppsSidebarPage ? (
             <header className="h-20 border-b border-gray-200 bg-white flex items-center justify-end px-8">
                <div className="flex items-center gap-6">
                     <div className="relative">
                        <Bell className="text-gray-500" size={22} />
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-[10px] font-bold text-white border border-white">4</span>
                     </div>
                     <div className="h-9 w-9 bg-purple-100 rounded-full flex items-center justify-center text-[#7C3AED]">
                        <User size={18} />
                     </div>
                </div>
            </header>
        ) : (
             <MerchantHeader breadcrumb={breadcrumb || undefined} />
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
