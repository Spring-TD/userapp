"use client"

import { useState } from "react"
import { Clock, CheckCircle, XCircle, Eye, ChevronDown, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/ui/table-skeleton"

interface Application {
  id: string
  productName: string
  productType: "loan" | "mortgage" | "savings" | "commodity"
  status: "pending" | "under_review" | "approved" | "rejected"
  amount: number
  currency: string
  submittedAt: string
  reviewedAt?: string
  reference?: string
}

interface UserApplicationsTableProps {
  applications: Application[]
  isLoading?: boolean
  onViewDetails?: (application: Application) => void
  onRefresh?: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-700",
    iconColor: "text-yellow-600",
  },
  under_review: {
    label: "Under Review",
    icon: Clock,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    iconColor: "text-blue-600",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    iconColor: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    iconColor: "text-red-600",
  },
}

const PRODUCT_TYPE_LABELS = {
  loan: "Loan",
  mortgage: "Mortgage",
  savings: "Savings",
  commodity: "Commodity",
}

export default function UserApplicationsTable({
  applications,
  isLoading = false,
  onViewDetails,
  onRefresh,
}: UserApplicationsTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₦"
    return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      searchQuery === "" ||
      app.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    const matchesType = typeFilter === "all" || app.productType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <TableSkeleton columnCount={7} rowCount={6} />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              >
                <option value="all">All Types</option>
                <option value="loan">Loan</option>
                <option value="mortgage">Mortgage</option>
                <option value="savings">Savings</option>
                <option value="commodity">Commodity</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                Refresh
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredApplications.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-500">No applications found</p>
          {applications.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Reference
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Product
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Type
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Submitted
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApplications.map((application) => {
                const statusConfig = STATUS_CONFIG[application.status]
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono text-gray-900">
                        {application.reference || application.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {application.productName}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className="text-xs">
                        {PRODUCT_TYPE_LABELS[application.productType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(application.amount, application.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bgColor}`}>
                        <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                        <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(application.submittedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {onViewDetails && (
                        <button
                          onClick={() => onViewDetails(application)}
                          className="inline-flex items-center gap-1 text-sm text-[#7C3AED] hover:text-[#6D28D9] font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {filteredApplications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing {filteredApplications.length} of {applications.length} applications
          </p>
        </div>
      )}
    </div>
  )
}
