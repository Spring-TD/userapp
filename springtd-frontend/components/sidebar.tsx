"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MdAddBox } from "react-icons/md"
import { FaMoneyBill, FaUsers } from "react-icons/fa"
import { IoMdCube } from "react-icons/io"
import { TbCodeCircle2Filled } from "react-icons/tb"
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { SearchIcon, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

interface SidebarProps {
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const navItems: NavItem[] = [
    {
      icon: <MdAddBox size={20} />,
      label: "Apps",
      href: "/dashboard/create-app/all-apps",
    },
    { icon: <FaUsers size={20} />, label: "Admin", href: "/dashboard/admin" },
    { icon: <IoMdCube size={20} />, label: "Compliance", href: "/dashboard/compliance" },
    { icon: <TbCodeCircle2Filled size={20} />, label: "Developer", href: "/dashboard/developer" },
  ]

  return (
    <div className={`w-64 bg-white border-r border-gray-200 h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>

      {/* Search */}
      <div className="px-6 mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9A813F] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)

            return (
              <li key={index}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-[#FFF9EA] text-[#9A813F] font-medium" : "text-gray-700 hover:bg-gray-100"
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
        <div className="mt-8 mb-2 px-3">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Section Title</h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            <Link
              href="/settings"
              className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${pathname.startsWith("/settings")
                ? "bg-[#FFF9EA] text-[#9A813F] font-medium"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <RiSettings3Fill size={20} />
              <span className="text-sm">Settings</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg"
              alt="Grace Ayo"
              className="w-9 h-9 rounded-full object-cover justify-center items-center"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Grace Ayo</p>
              <p className="text-xs text-gray-500">grace.yo@spring.td</p>
            </div>
          </div>
          <FiLogOut size={20} className="text-gray-500 cursor-pointer" />
        </div>
      </div>
    </div>
  )
}

export default Sidebar
