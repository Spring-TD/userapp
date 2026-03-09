"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const tabs = [
  { label: "Loan requests", value: "requests" },
  { label: "Under review", value: "review" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
  { label: "Blacklisted", value: "blacklisted" },
]

const mortgagesData = {
  requests: [
    { loanRequest: "Mortgage Name", name: "Gina Vera", ref: "235367B909", date: "Apr 12, 2025", status: "Requested" },
    { loanRequest: "Mortgage Name", name: "John Doe", ref: "235367B910", date: "Apr 12, 2025", status: "Requested" },
    { loanRequest: "Mortgage Name", name: "Jane Smith", ref: "235367B911", date: "Apr 11, 2025", status: "Requested" },
  ],
  review: [
    { loanRequest: "Mortgage Name", name: "Gina Vera", ref: "235367B909", date: "Apr 12, 2025", status: "Review" },
    { loanRequest: "Mortgage Name", name: "John Doe", ref: "235367B910", date: "Apr 12, 2025", status: "Review" },
    { loanRequest: "Mortgage Name", name: "Jane Smith", ref: "235367B911", date: "Apr 11, 2025", status: "Review" },
  ],
  approved: [
    { loanRequest: "Mortgage Name", name: "Gina Vera", ref: "235367B909", date: "Apr 12, 2025", status: "Requested" },
    { loanRequest: "Mortgage Name", name: "John Doe", ref: "235367B910", date: "Apr 12, 2025", status: "Requested" },
    { loanRequest: "Mortgage Name", name: "Jane Smith", ref: "235367B911", date: "Apr 11, 2025", status: "Requested" },
  ],
  declined: [
    { loanRequest: "Mortgage Name", name: "Gina Vera", ref: "235367B909", date: "Apr 12, 2025", status: "Declined" },
    { loanRequest: "Mortgage Name", name: "John Doe", ref: "235367B910", date: "Apr 12, 2025", status: "Declined" },
    { loanRequest: "Mortgage Name", name: "Jane Smith", ref: "235367B911", date: "Apr 11, 2025", status: "Declined" },
  ],
  blacklisted: [
    { loanRequest: "Mortgage Name", name: "Gina Vera", ref: "235367B909", date: "Apr 12, 2025", status: "Declined" },
    { loanRequest: "Mortgage Name", name: "John Doe", ref: "235367B910", date: "Apr 12, 2025", status: "Declined" },
    { loanRequest: "Mortgage Name", name: "Jane Smith", ref: "235367B911", date: "Apr 11, 2025", status: "Declined" },
  ],
}

export default function MortgageWorkflowPage() {
  const [activeTab, setActiveTab] = useState("requests")

  const getStatusBadge = (status: string) => {
    const styles = {
      Requested: "bg-[#E9D5FF] text-[#7C3AED] hover:bg-[#E9D5FF]",
      Review: "bg-[#DBEAFE] text-[#2563EB] hover:bg-[#DBEAFE]",
      Declined: "bg-[#FEE2E2] text-[#EF4444] hover:bg-[#FEE2E2]",
    }
    return styles[status as keyof typeof styles] || styles.Requested
  }

  const mortgages = mortgagesData[activeTab as keyof typeof mortgagesData]

  return (
    <div className="p-8 bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mortgage Workflow</h1>
      {/* </CHANGE> */}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-4 px-1 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.value
                  ? "border-[#7C3AED] text-[#7C3AED]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Loan Request</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Name</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Ref</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Date</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-700">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mortgages.map((mortgage, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{mortgage.loanRequest}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.ref}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{mortgage.date}</td>
                <td className="px-6 py-4">
                  <Badge className={getStatusBadge(mortgage.status)}>{mortgage.status}</Badge>
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
