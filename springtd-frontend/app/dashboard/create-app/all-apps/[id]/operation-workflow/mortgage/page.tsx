"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"

export default function MortgageWorkflowPage() {
  const [activeTab, setActiveTab] = useState("pending")

  const tabs = [
    { id: "pending", label: "Pending Applications" },
    { id: "processing", label: "Processing" },
    { id: "approved", label: "Approved" },
    { id: "disbursed", label: "Disbursed" },
    { id: "rejected", label: "Rejected" },
  ]

  const getStatusConfig = () => {
    switch (activeTab) {
      case "pending":
        return { text: "Pending", bgColor: "bg-[#D4C5B0]", textColor: "text-[#6B5D4F]" }
      case "processing":
        return { text: "Processing", bgColor: "bg-blue-100", textColor: "text-blue-700" }
      case "approved":
        return { text: "Approved", bgColor: "bg-green-100", textColor: "text-green-700" }
      case "disbursed":
        return { text: "Disbursed", bgColor: "bg-purple-100", textColor: "text-purple-700" }
      case "rejected":
        return { text: "Rejected", bgColor: "bg-red-100", textColor: "text-red-700" }
      default:
        return { text: "Pending", bgColor: "bg-gray-100", textColor: "text-gray-700" }
    }
  }

  const statusConfig = getStatusConfig()

  const mortgages = [
    {
      mortgageRequest: "Mortgage Name",
      name: "Gina Vera",
      ref: "2353678909",
      date: "Apr 12, 2025",
    },
    {
      mortgageRequest: "Mortgage Name",
      name: "Gina Vera",
      ref: "2353678909",
      date: "Apr 12, 2025",
    },
    {
      mortgageRequest: "Mortgage Name",
      name: "Gina Vera",
      ref: "2353678909",
      date: "Apr 11, 2025",
    },
  ]

  return (
    <div className="flex-1 bg-white p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mortgage Workflow</h1>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id ? "text-[#8B7355]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B7355]"></div>}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F5F5F5]">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Mortgage Request</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Ref</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mortgages.map((mortgage, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{mortgage.mortgageRequest}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.ref}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.date}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
                  >
                    {statusConfig.text}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={18} />
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
