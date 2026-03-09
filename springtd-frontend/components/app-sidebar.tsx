"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FaWallet } from "react-icons/fa"
import { IoMdCube } from "react-icons/io"
import { GitBranch } from "lucide-react"
import { RiSettings3Fill } from "react-icons/ri"
import { FiLogOut } from "react-icons/fi"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

interface NavItem {
  icon: React.ReactNode
  label: string
  href: string
  subItems?: { label: string; href: string }[]
}

interface AppSidebarProps {
  className?: string
  appId: string
}

const AppSidebar: React.FC<AppSidebarProps> = ({ className = "", appId }) => {
  const pathname = usePathname()
  const [isWalletsOpen, setIsWalletsOpen] = useState(true)
  const [isProductsOpen, setIsProductsOpen] = useState(false)
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false)

  const navItems: NavItem[] = [
    {
      icon: <FaWallet size={20} />,
      label: "Wallets",
      href: `/dashboard/create-app/all-apps/${appId}/wallets`,
      subItems: [
        { label: "Treasury wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/treasury` },
        { label: "Repayment Wallet", href: `/dashboard/create-app/all-apps/${appId}/wallets/repayment` },
      ],
    },
    {
      icon: <IoMdCube size={20} />,
      label: "Products",
      href: `/dashboard/create-app/all-apps/${appId}/products`,
      subItems: [
        { label: "All Products", href: `/dashboard/create-app/all-apps/${appId}/products` },
        { label: "Product Overview", href: `/dashboard/create-app/all-apps/${appId}/products/overview` },
      ],
    },
    {
      icon: <GitBranch size={20} />,
      label: "Operation Workflow",
      href: `/dashboard/create-app/all-apps/${appId}/operation-workflow`,
      subItems: [
        { label: "Loan Workflow", href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/loan` },
        { label: "Mortgage Workflow", href: `/dashboard/create-app/all-apps/${appId}/operation-workflow/mortgage` },
      ],
    },
  ]

  return (
    <div className={`w-64 bg-white border-r border-[#E0D8C3] h-screen flex flex-col ${className}`}>
      {/* Logo */}
      <div className="p-6">
        <span className="text-xl font-bold text-[#9A813F]">Product Builder</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-4">
          {navItems.map((item, index) => {
            const isActive = pathname.startsWith(item.href)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isOpen =
              item.label === "Wallets"
                ? isWalletsOpen
                : item.label === "Products"
                  ? isProductsOpen
                  : item.label === "Operation Workflow"
                    ? isWorkflowOpen
                    : false
            const setIsOpen =
              item.label === "Wallets"
                ? setIsWalletsOpen
                : item.label === "Products"
                  ? setIsProductsOpen
                  : item.label === "Operation Workflow"
                    ? setIsWorkflowOpen
                    : () => {}

            return (
              <li key={index}>
                {hasSubItems ? (
                  <div>
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors ${
                        isActive ? "bg-[#FDF8EB] text-[#9A813F] font-medium" : "text-gray-700 hover:bg-[#FFF3D380]"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {/* Sub-items */}
                    {isOpen && (
                      <ul className="mt-2 ml-9 space-y-2">
                        {item.subItems?.map((subItem, subIndex) => {
                          const isSubActive = pathname === subItem.href
                          return (
                            <li key={subIndex}>
                              <Link
                                href={subItem.href}
                                className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                                  isSubActive
                                    ? "text-[#9A813F] font-medium"
                                    : "text-gray-600 hover:text-[#9A813F] hover:bg-[#FFF3D380]"
                                }`}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive ? "bg-[#FDF8EB] text-[#9A813F] font-medium" : "text-gray-700 hover:bg-[#FFF3D380]"
                    }`}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>

        {/* Section Title */}
        <div className="mt-8 mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Section Title</h3>
        </div>

        {/* Settings */}
        <ul>
          <li>
            <Link
              href={`/dashboard/create-app/all-apps/${appId}/settings`}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                pathname.startsWith(`/dashboard/create-app/all-apps/${appId}/settings`)
                  ? "bg-[#FDF8EB] text-[#9A813F] font-medium"
                  : "text-gray-700 hover:bg-[#FFF3D380]"
              }`}
            >
              <RiSettings3Fill size={20} />
              <span>Settings</span>
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

export default AppSidebar
