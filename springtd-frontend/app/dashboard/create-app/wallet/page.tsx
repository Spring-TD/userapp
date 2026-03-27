"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, User, Search } from "lucide-react"
import { FiEyeOff } from "react-icons/fi"

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState("wallet")

  const tabs = [
    { id: "wallet", label: "Wallet" },
    { id: "products", label: "Products" },
    { id: "transactions", label: "Transactions" },
    { id: "drive", label: "Drive" },
  ]

  const walletRecords = [
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:25 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      userEmail: "grace.yo@spring.td",
      userPhone: "+234703674538",
    },
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
        {/* Balance Card */}
        <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Available Balance</p>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-5xl font-semibold">$ 0.00</span>
                <span className="text-white text-2xl">.00</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <FiEyeOff className="text-gray-400" size={24} />
              <Button className="bg-[#9A813F] hover:bg-[#8A7335] text-white">Withdraw</Button>
            </div>
          </div>
        </div>

        {/* Wallet Record */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Wallet Record</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#9A813F] text-sm w-64"
            />
          </div>
        </div>

        {/* Records Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F5F5F5]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Timestamp</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Fee</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Meta_Ref</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">User email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">User Phone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {walletRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{record.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                    {record.ref}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="8" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.fee}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                    {record.metaRef}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="8" r="8" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.userEmail}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{record.userPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
