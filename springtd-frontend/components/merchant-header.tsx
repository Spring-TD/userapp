"use client"

import { Bell, User, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface MerchantHeaderProps {
  appName?: string
  breadcrumb?: React.ReactNode
}

export default function MerchantHeader({ appName = "ABC Mortgage App", breadcrumb }: MerchantHeaderProps) {
  const router = useRouter()
  
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button 
           className="p-1 hover:bg-gray-100 rounded transition-colors"
           onClick={() => router.push("/dashboard/merchant")}
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          {appName && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[#7C3AED] text-white hover:bg-[#6D28D9] hover:text-white border-none"
                >
                  {appName}
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>ABC Mortgage App</DropdownMenuItem>
                <DropdownMenuItem>XYZ Loan App</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {breadcrumb && <div className="text-sm flex items-center">{breadcrumb}</div>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#7C3AED] rounded-full"></span>
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <User size={20} className="text-gray-600" />
        </button>
      </div>
    </header>
  )
}
