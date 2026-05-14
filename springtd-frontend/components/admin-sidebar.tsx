"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Plus, DollarSign, Users, Briefcase, Package, Wallet, Settings, LogOut } from "lucide-react"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
}

interface AdminSidebarProps {
  className?: string
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { icon: <LayoutGrid size={20} />, label: "Overview", href: "/admin/overview" },
    { icon: <Plus size={20} />, label: "App", href: "/admin/app" },
    { icon: <Package size={20} />, label: "Product", href: "/admin/product" },
    { icon: <Wallet size={20} />, label: "Wallet and Balances", href: "/admin/wallet-and-balances" },
    { icon: <Users size={20} />, label: "Users", href: "/admin/users" },
    { icon: <Briefcase size={20} />, label: "Business", href: "/admin/business" },
    { icon: <DollarSign size={20} />, label: "Billing", href: "/admin/billing" },
    { icon: <Package size={20} />, label: "Compliance", href: "/admin/compliance" },
  ]

  return (
    <div className={`w-64 bg-[#1E2130] border-r border-gray-800 h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl text-white">
          <span className="font-bold">Spring</span> <span className="font-normal">Admin</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)

            return (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-md transition-colors ${
                    isActive ? "bg-[#2D3142] text-white" : "text-gray-300 hover:bg-[#2D3142] hover:text-white"
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Section Title */}
        <div className="mt-8 mb-2 px-3 pt-8 border-t border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Section Title</h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            <Link
              href="/admin/settings"
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                pathname.startsWith("/admin/settings")
                  ? "bg-[#2D3142] text-white"
                  : "text-gray-300 hover:bg-[#2D3142] hover:text-white"
              }`}
            >
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg"
                alt="Grace Ayo"
                className="w-9 h-9 rounded-full object-cover"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1E2130]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Grace Ayo</p>
              <p className="text-xs text-gray-400">grace.yo@spring.td</p>
            </div>
          </div>
          <LogOut size={20} className="text-gray-400 cursor-pointer hover:text-gray-300" />
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar
