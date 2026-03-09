"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { billingService } from "@/lib/services/billing-service"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/billing-utils"
import type { Transaction } from "@/types/billing"

export default function AdminBillingPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [billings, setBillings] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchBillings()
  }, [activeTab, currentPage])

  const fetchBillings = async () => {
    try {
      setLoading(true)
      setError(null)

      const params: any = {
        page: currentPage,
        limit: 6,
      }

      // Add status filter based on active tab
      if (activeTab === "incoming") {
        params.status = "incoming"
      } else if (activeTab === "pending") {
        params.status = "pending"
      }

      const response = await billingService.getTransactions(params)

      if (response.success && response.data) {
        setBillings(response.data)
      } else {
        setBillings([])
      }
    } catch (err: any) {
      console.error('Error fetching billings:', err)
      setError(err.message || 'Failed to load billings')
      setBillings([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (billing: Transaction) => {
    // Implement download functionality
    console.log('Download billing:', billing.id)
  }

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-4 text-sm relative ${activeTab === "all" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            All billings
            {activeTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("incoming")}
            className={`py-4 text-sm relative ${activeTab === "incoming" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Incoming billing
            {activeTab === "incoming" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-4 text-sm relative ${activeTab === "pending" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Pending billings
            {activeTab === "pending" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-xl font-medium text-gray-900 mb-6">
          {activeTab === "all" ? "All Billings" : activeTab === "incoming" ? "Incoming Billings" : "Pending Billings"}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#3061F5]" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchBillings}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        ) : billings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2">No billings found</p>
            <p className="text-sm text-gray-400">Billing records will appear here</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Amount</th>
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Payment Method</th>
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Transaction ID</th>
                    <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Payment link</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map((billing) => (
                    <tr key={billing.id} className="border-b border-gray-200 bg-white">
                      <td className="py-4 px-4 text-sm">{formatDate(billing.date || billing.createdAt)}</td>
                      <td className="py-4 px-4 text-sm">{formatCurrency(billing.amount, billing.currency)}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${getStatusColor(billing.status)}`}
                        >
                          {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{billing.paymentMethod || 'N/A'}</td>
                      <td className="py-4 px-4 text-sm">{billing.transactionId}</td>
                      <td className="py-4 px-4">
                        {billing.status === 'successful' ? (
                          <button
                            onClick={() => handleDownload(billing)}
                            className="text-sm text-gray-900 border border-gray-300 px-4 py-1.5 rounded-lg hover:bg-gray-50"
                          >
                            Download
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400 border border-gray-200 px-4 py-1.5 rounded-lg">
                            Unavailable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12.5 15L7.5 10L12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {[1, 2, 3, 4, 5, 6].map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded text-sm ${currentPage === page
                    ? "bg-white border border-[#3061F5] text-[#3061F5]"
                    : "hover:bg-gray-100"
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M7.5 15L12.5 10L7.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

