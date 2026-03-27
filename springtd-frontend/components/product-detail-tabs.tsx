"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { label: "General Info", value: "active-loan" }, 
  { label: "Active Loan", value: "real-active-loan" },
  { label: "Inactive Loan", value: "inactive-loan" },
  { label: "Customers", value: "customers" },
  { label: "Transactions", value: "transactions" },
  { label: "Pricing Settings", value: "configuration" },
]

export default function ProductDetailTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-8">
        {tabs.map((tab) => {
          const isActive = pathname.includes(`/${tab.value}`)
          return (
            <Link
              key={tab.value}
              href={`/dashboard/merchant/products/active/${tab.value}`}
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
