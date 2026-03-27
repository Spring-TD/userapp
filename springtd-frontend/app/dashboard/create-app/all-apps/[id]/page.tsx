"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, MoreVertical, X } from "lucide-react"

export default function UserAppDetailsPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState("general-info")

  console.log("[v0] App ID from params:", params.id)

  // Mock data - in real app, fetch based on params.id
  const appData = {
    id: params.id,
    name: "ABC",
    requested: "N5,000,000",
    requestedPeriod: "6 months",
    approved: "N4,000,000",
    approvedPeriod: "5 months",
    totalInterest: "N1,200,000",
    interestRate: "7% monthly",
  }

  const products = [
    {
      name: "Mortgage Products",
      count: 3,
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
    },
    {
      name: "Mortgage Products",
      count: 3,
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
    },
    {
      name: "Mortgage Products",
      count: 3,
      customers: 203,
      capital: "NGN12,233,000",
      issued: "NGN120,233,300",
      repayment: "NGN10,233,300",
    },
    {
      name: "Mortgage Products",
      count: 3,
      customers: 203,
      inventory: "NGN12,233,000",
      sales: "NGN120,233,300",
    },
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
    <div className="flex-1 bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {activeTab === "general-info" ? "App Overview" : "Application Details"}
        </h1>
        <Button className="bg-[#8B7355] text-white hover:bg-[#7A6449] gap-2">
          <X size={16} />
          Suspend Apps
        </Button>
      </div>

      {/* Stats Card */}
      <div className="bg-[#2C3038] rounded-2xl p-8 mb-6">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-gray-400 text-sm mb-2">Requested</p>
            <p className="text-white text-3xl font-semibold mb-1">{appData.requested}</p>
            <p className="text-gray-400 text-sm">{appData.requestedPeriod}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Approved</p>
            <p className="text-white text-3xl font-semibold mb-1">{appData.approved}</p>
            <p className="text-gray-400 text-sm">{appData.approvedPeriod}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Total interest</p>
            <p className="text-white text-3xl font-semibold mb-1">{appData.totalInterest}</p>
            <p className="text-gray-400 text-sm">{appData.interestRate}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-200 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger
            value="general-info"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            General Info
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            Customers
          </TabsTrigger>
          <TabsTrigger
            value="new-submission"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            New Submission
          </TabsTrigger>
          <TabsTrigger
            value="transaction"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#8B7355] data-[state=active]:text-[#8B7355] data-[state=active]:bg-transparent px-6 py-3"
          >
            Transaction
          </TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="general-info" className="mt-6">
          <div className="grid grid-cols-4 gap-6">
            {products.map((product, index) => (
              <div key={index} className="space-y-4">
                {/* Product Card */}
                <div className="bg-[#8B7355] rounded-xl p-6 flex items-center gap-4">
                  <div className="flex flex-col items-start gap-2 flex-1">
                    <Package className="text-white" size={32} />
                    <p className="text-white text-lg font-medium leading-tight">{product.name}</p>
                  </div>
                  <div className="w-px h-20 bg-white/30" />
                  <div className="flex items-center justify-center">
                    <p className="text-white text-6xl font-bold">{product.count}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Customers</span>
                    <span className="text-sm font-medium text-gray-900">{product.customers}</span>
                  </div>
                  {index === 3 ? (
                    <>
                      <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Inventory</span>
                        <span className="text-sm font-medium text-gray-900">{product.inventory}</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Sales</span>
                        <span className="text-sm font-medium text-gray-900">{product.sales}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Capital</span>
                        <span className="text-sm font-medium text-gray-900">{product.capital}</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Issued</span>
                        <span className="text-sm font-medium text-gray-900">{product.issued}</span>
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">Repayment</span>
                        <span className="text-sm font-medium text-gray-900">{product.repayment}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="mt-6">
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-[#F5F1E8] text-[#8B7355] border-none hover:bg-[#E5E1D8]"
                      >
                        View upload
                      </Button>
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
        </TabsContent>

        {/* New Submission Tab */}
        <TabsContent value="new-submission" className="mt-6">
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-[#F5F1E8] text-[#8B7355] border-none hover:bg-[#E5E1D8]"
                      >
                        View upload
                      </Button>
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
        </TabsContent>

        {/* Transaction Tab */}
        <TabsContent value="transaction" className="mt-6">
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
                      {transaction.paymentLink === "Download" ? (
                        <Button variant="outline" size="sm" className="border-gray-300 bg-transparent">
                          Download
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">Unavailable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
