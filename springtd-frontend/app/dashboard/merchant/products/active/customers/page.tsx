"use client"

import ProductOverviewStats from "@/components/product-overview-stats"
import ProductDetailTabs from "@/components/product-detail-tabs"
import { Search, SlidersHorizontal, MoreVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function CustomersPage() {
  const customers = [
    {
      userName: "Grace Ayomide",
      email: "Graceayo@email.com",
      userId: "X20445-78P",
    },
    {
      userName: "Chidi Obi",
      email: "chidiobi@email.com",
      userId: "X20445-78P",
    },
    {
      userName: "Grace Ayomide",
      email: "Graceayo@email.com",
      userId: "X20445-78P",
    },
    {
      userName: "Chidi Obi",
      email: "chidiobi@email.com",
      userId: "X20445-78P",
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">User Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Submitted File</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((customer, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{customer.userName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{customer.userId}</td>
                <td className="px-6 py-4">
                  <Button variant="secondary" size="sm" className="bg-gray-200 hover:bg-gray-300 text-gray-700">
                    View
                  </Button>
                </td>
                <td className="px-6 py-4">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
