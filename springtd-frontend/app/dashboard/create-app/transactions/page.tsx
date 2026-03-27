"use client"

import { useState } from "react"
import { Bell, User } from "lucide-react"

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("transactions")

  const tabs = [
    { id: "wallet", label: "Wallet" },
    { id: "products", label: "Products" },
    { id: "transactions", label: "Transactions" },
    { id: "drive", label: "Drive" },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-end gap-4 mb-6">
          <button className="relative p-2 hover:bg-gray-100 rounded-full">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#9A813F] rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <User size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-[#9A813F]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9A813F]"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Transactions</h2>
        <p className="text-gray-500">Transaction history will appear here.</p>
      </div>
    </div>
  )
}
