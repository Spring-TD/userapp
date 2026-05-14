"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { HiMiniUser } from "react-icons/hi2"
import { FaBell } from "react-icons/fa"
import { ChevronLeft } from "lucide-react"

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/overview": { title: "Overview", subtitle: "Summary of your activity" },
  "/dashboard/create-app": { title: "Create App", subtitle: "Launch your new app quickly" },
  "/dashboard/admin": { title: "Admin", subtitle: "Manage users and roles" },
  "/dashboard/billing": { title: "Billing", subtitle: "Track payments and invoices" },
  "/dashboard/compliance": { title: "Compliance", subtitle: "Control your integrations" },
  "/dashboard/developer": { title: "Developer", subtitle: "Developer tools & APIs" },
  "/dashboard/settings": { title: "Settings", subtitle: "Adjust your preferences" },
}

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  onBack?: () => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title: customTitle,
  subtitle: customSubtitle,
  showBackButton = false,
  onBack,
}) => {
  const pathname = usePathname()
  const router = useRouter()

  const { title, subtitle } = customTitle
    ? { title: customTitle, subtitle: customSubtitle || "" }
    : routeTitles[pathname] || { title: "Dashboard", subtitle: "Welcome to your dashboard" }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <header className="bg-white">
      {/* Top mini-bar */}
      <div className="px-6 pt-3 flex items-center justify-end">
        <div className="h-6 w-px bg-gray-200 mr-6" />

        <div className="flex items-center gap-6">
          {/* Notification */}
          <div className="relative">
            <FaBell className="h-6 w-6 text-gray-600" />
            <span className="absolute -top-1 -right-1 bg-[#9A813F] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              4
            </span>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-[#F0ECE2] flex items-center justify-center">
            <HiMiniUser className="h-4 w-4 text-[#9A813F]" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-[#E0D8C3] mt-4" />

      {/* Main header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button onClick={handleBack} className="text-gray-600 hover:text-gray-900 transition-colors">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        {!customTitle && (
          <div>
            <button className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-800 transition-colors">
              Submit
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
