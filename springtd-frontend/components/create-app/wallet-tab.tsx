"use client"

import { Search } from "lucide-react"
import { FiEyeOff, FiEye } from "react-icons/fi"
import { IoIosCopy } from "react-icons/io"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function WalletTab() {
  const [showBalance, setShowBalance] = useState(true)

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <>
      {/* Balance Card */}
      <div className="bg-black rounded-lg p-8 mb-8 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm mb-2">Available Balance</p>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-5xl font-semibold">$ 0.00</span>
              <span className="text-white/70 text-2xl">.00</span>
            </div>
          </div>

          <button
            onClick={() => setShowBalance(!showBalance)}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
          >
            {showBalance ? <FiEye size={24} /> : <FiEyeOff size={24} />}
          </button>

          <Button className="bg-[#9A813F] hover:bg-[#8A7335] text-white px-8">Withdraw</Button>
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
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {record.ref}
                    <button onClick={() => handleCopy(record.ref)} className="hover:text-[#9A813F]">
                      <IoIosCopy size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.timestamp}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.fee}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.product}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    {record.metaRef}
                    <button onClick={() => handleCopy(record.metaRef)} className="hover:text-[#9A813F]">
                      <IoIosCopy size={16} />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.userEmail}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{record.userPhone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
