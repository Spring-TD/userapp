"use client"

import ProductOverviewStats from "@/components/product-overview-stats"
import ProductDetailTabs from "@/components/product-detail-tabs"
import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function TransactionsPage() {
  const transactions = [
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      user: "grace.yo@spring.td",
      phone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      user: "grace.yo@spring.td",
      phone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      user: "grace.yo@spring.td",
      phone: "+234703674538",
    },
    {
      amount: "$0.45",
      ref: "SPI-234-BY45K",
      timestamp: "12:45 / Apr 12, 2025",
      fee: "$0.2",
      product: "Quick Vast",
      metaRef: "X20445-78P",
      user: "grace.yo@spring.td",
      phone: "+234703674538",
    },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Product Overview</h1>
      {/* </CHANGE> */}

      <ProductOverviewStats />

      <h2 className="text-xl font-bold text-gray-900 mb-6">XYZ Mortgage Product</h2>

      <ProductDetailTabs />

      <div className="flex items-center justify-end gap-4 mb-6">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input placeholder="Search" className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <SlidersHorizontal size={20} />
          Sort
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Fee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Meta_Ref</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">All users</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">User Phone</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.amount}</td>
                <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                  {transaction.ref}
                  <button className="text-gray-400">●</button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.timestamp}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.fee}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.product}</td>
                <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                  {transaction.metaRef}
                  <button className="text-gray-400">●</button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.user}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
