"use client"

import { useState } from "react"
import { WalletTab } from "@/components/create-app/wallet-tab"
import { ProductsTab } from "@/components/create-app/products-tab"
import { TransactionsTab } from "@/components/create-app/transactions-tab"
import { DriveTab } from "@/components/create-app/drive-tab"

type TabType = "wallet" | "products" | "transactions" | "drive"

export default function NewAppsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("wallet")

  const tabs = [
    { id: "wallet" as TabType, label: "Wallet" },
    { id: "products" as TabType, label: "Products" },
    { id: "transactions" as TabType, label: "Transactions" },
    { id: "drive" as TabType, label: "Drive" },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-4">
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
        {activeTab === "wallet" && <WalletTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "transactions" && <TransactionsTab />}
        {activeTab === "drive" && <DriveTab />}
      </div>
    </div>
  )
}
