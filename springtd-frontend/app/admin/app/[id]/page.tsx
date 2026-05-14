"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Package, MoreVertical } from "lucide-react"
import { useParams } from "next/navigation"

export default function ApplicationDetailsPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState("general")

  const tabs = [
    { id: "general", label: "General Info" },
    { id: "customers", label: "Customers" },
    { id: "submission", label: "New Submission" },
    { id: "transaction", label: "Transaction" },
  ]

  const customers = [
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
    {
      name: "Grace Chidi",
      email: "youremail@email.com",
      phone: "+234701234567",
      dateTime: "Apr 12, 2025   09:32AM",
      status: "Successful",
    },
  ]

  const transactions = [
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Successful",
      paymentMethod: "Visa 5134",
      transactionId: "3456788944",
      paymentLink: "Download",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Failed",
      paymentMethod: "Bank transfer",
      transactionId: "3456788944",
      paymentLink: "Unavailable",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Successful",
      paymentMethod: "Bank transfer",
      transactionId: "3456788944",
      paymentLink: "Unavailable",
    },
    {
      date: "12/09/2025",
      amount: "N10,000",
      status: "Pending",
      paymentMethod: "Mastercard 5031",
      transactionId: "3456788944",
      paymentLink: "Download",
    },
  ]

  return (
    <div className="flex-1 bg-white">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Application Details</h1>
          <Button className="bg-[#4169E1] text-white hover:bg-[#3557c7] gap-2">
            <X size={16} />
            Suspend Apps
          </Button>
        </div>

        {/* Stats Card */}
        <div className="bg-[#1E2130] rounded-2xl p-8 mb-6">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <p className="text-gray-400 text-sm mb-2">Requested</p>
              <p className="text-white text-3xl font-semibold mb-1">N5,000,000</p>
              <p className="text-gray-400 text-sm">6 months</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Approved</p>
              <p className="text-white text-3xl font-semibold mb-1">N4,000,000</p>
              <p className="text-gray-400 text-sm">5 months</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-2">Total interest</p>
              <p className="text-white text-3xl font-semibold mb-1">N1,200,000</p>
              <p className="text-gray-400 text-sm">7% monthly</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id ? "text-[#4169E1]" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4169E1]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="space-y-4">
                <div className="bg-[#4169E1] rounded-xl p-6 flex items-center gap-6">
                  <div className="flex flex-col items-start gap-3 flex-1">
                    <Package className="text-white" size={48} />
                    <p className="text-white text-xl font-medium">Mortgage Products</p>
                  </div>
                  <div className="w-px h-24 bg-white/30" />
                  <div className="flex items-center justify-center">
                    <p className="text-white text-7xl font-bold">3</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Customers</span>
                    <span className="text-sm font-medium text-gray-900">203</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Capital</span>
                    <span className="text-sm font-medium text-gray-900">NGN12,233,000</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Issued</span>
                    <span className="text-sm font-medium text-gray-900">NGN120,233,300</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Repayment</span>
                    <span className="text-sm font-medium text-gray-900">NGN10,233,300</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeTab === "customers" || activeTab === "submission") && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F5F5F5]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Phone</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date/time</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Upload</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.dateTime}</td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-[#6B7FE8] hover:text-[#5568d3] font-medium">View upload</button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "transaction" && (
          <div>
            <div className="flex justify-end mb-4">
              <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600">
                <option>Sort by</option>
              </select>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F5F5F5]">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Payment Method</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Transaction ID</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Payment link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{transaction.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{transaction.amount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.status === "Successful"
                              ? "bg-green-100 text-green-700"
                              : transaction.status === "Failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transaction.paymentMethod}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{transaction.transactionId}</td>
                      <td className="px-6 py-4">
                        <button
                          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                            transaction.paymentLink === "Download"
                              ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                              : "text-gray-400 cursor-not-allowed"
                          }`}
                          disabled={transaction.paymentLink === "Unavailable"}
                        >
                          {transaction.paymentLink}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
