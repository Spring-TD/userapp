"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { User, Bell } from "lucide-react"

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin/overview": { title: "Overview", subtitle: "Summary of admin activity" },
  "/admin/app": { title: "App", subtitle: "Manage applications" },
  "/admin/product": { title: "Product", subtitle: "Manage products and transactions" },
  "/admin/wallet": { title: "Wallet and Balances", subtitle: "Manage wallets and balances" },
  "/admin/users": { title: "Users", subtitle: "Manage user accounts" },
  "/admin/business": { title: "Business", subtitle: "Manage business accounts" },
  "/admin/billing": { title: "Billing", subtitle: "Track payments and invoices" },
  "/admin/compliance": { title: "Compliance", subtitle: "Control integrations and compliance" },
  "/admin/settings": { title: "Settings", subtitle: "Adjust admin preferences" },
}

export const AdminDashboardHeader: React.FC = () => {
  const pathname = usePathname()

  // Default to Dashboard if path not found
  let routeInfo = routeTitles[pathname]

  if (!routeInfo && pathname.startsWith("/admin/app/")) {
    routeInfo = { title: "Application Details", subtitle: "View and manage application information" }
  }

  const { title, subtitle } = routeInfo || {
    title: "Admin Dashboard",
    subtitle: "Welcome to admin dashboard",
  }

  return (
    <header className="bg-white">
      {/* Top mini-bar */}
      <div className="px-6 pt-3 flex items-center justify-end">
        <div className="h-6 w-px bg-gray-200 mr-6" />

        <div className="flex items-center gap-6">
          {/* Notification */}
          <div className="relative">
            <Bell className="h-6 w-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-[#3061F5] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              4
            </span>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-4 w-4 text-[#3061F5]" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-gray-200 mt-4" />

      {/* Main header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}
