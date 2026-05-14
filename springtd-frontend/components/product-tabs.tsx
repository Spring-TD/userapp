"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "Mortgage", value: "mortgage" },
  { label: "Loan", value: "loan" },
  { label: "Savings", value: "savings" },
  { label: "Investment", value: "investment" },
  { label: "Commodity", value: "commodity" },
]

interface ProductTabsProps {
  showBorder?: boolean
  appId?: string
}

export default function ProductTabs({ showBorder = true, appId }: ProductTabsProps) {
  const pathname = usePathname()

  return (
    <div className={showBorder ? "border-b border-gray-200 mb-6" : ""}>
      <nav className="flex gap-8">
        {tabs.map((tab) => {
          const isActive = pathname.includes(`/products/all/${tab.value}`)
          const href = appId 
            ? `/dashboard/merchant/products/all/${tab.value}?appId=${appId}`
            : `/dashboard/merchant/products/all/${tab.value}`
          return (
            <Link
              key={tab.value}
              href={href}
              className={`pb-4 px-1 text-sm font-medium transition-colors border-b-2 ${
                isActive ? "border-[#7C3AED] text-[#7C3AED]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
