"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, User, ShieldCheck, Code2, Settings, Search, LogOut } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function MerchantAppsSidebar() {
  const pathname = usePathname()

  const navItems = [
    { icon: <LayoutGrid size={20} />, label: "Apps", href: "/dashboard/merchant" },
    { icon: <User size={20} />, label: "Admin", href: "/dashboard/merchant/admin" },
    { icon: <ShieldCheck size={20} />, label: "Compliance", href: "/dashboard/merchant/compliance" },
    { icon: <Code2 size={20} />, label: "Developer", href: "/dashboard/merchant/developer" },
  ]

  return (
    <div className="w-64 bg-[#F9F9FB] border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#7C3AED]">Spring TD</h1>
      </div>

      {/* Search */}
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input 
            placeholder="Search" 
            className="pl-9 h-10 bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#E0E7FF] text-[#7C3AED]" // Active state based on purple tint in screenshot
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}

        <div className="pt-8 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
           Section Title
        </div>
        
        <Link
          href="/dashboard/merchant/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 mt-1"
        >
          <Settings size={20} />
          Settings
        </Link>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
                <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                    alt="User"
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">Grace Ayo</p>
                <p className="text-xs text-gray-500 truncate">grace.yo@spring.td</p>
            </div>
            <LogOut size={18} className="text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>
    </div>
  )
}
