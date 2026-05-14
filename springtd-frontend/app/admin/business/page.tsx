"use client"

import { Search, ChevronDown, Eye, MoreVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function AdminBusinessPage() {
  const businesses = [
    {
      businessDetails: "Business Details",
      contactPerson: "Chidi oli",
      phone: "+234801234567B",
      industry: "Logistics",
      kycStatus: "Completed",
      status: "Verified",
      submissionDate: "Sept 19, 2025",
    },
    {
      businessDetails: "Business Details",
      contactPerson: "Vera Vera",
      phone: "+234801234567B",
      industry: "Fintech",
      kycStatus: "Failed",
      status: "Rejected",
      submissionDate: "Sept 19, 2025",
    },
    {
      businessDetails: "Business Details",
      contactPerson: "Chidi oli",
      phone: "+234801234567B",
      industry: "Logistics",
      kycStatus: "Document Review",
      status: "Pending Review",
      submissionDate: "Sept 19, 2025",
    },
    {
      businessDetails: "Business Details",
      contactPerson: "Vera Vera",
      phone: "+234801234567B",
      industry: "Banking",
      kycStatus: "Completed",
      status: "Verified",
      submissionDate: "Sept 19, 2025",
    },
  ]

  return (
    <div className="flex-1 bg-white p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900 mb-2">Business Management</h1>
        <p className="text-sm text-gray-600">Manage business accounts, KYB processes, and corporate verification</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Total Businesses</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">2,847</p>
          <p className="text-xs text-green-600">+12.5% from last month</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Verified Businesses</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">2,456</p>
          <p className="text-xs text-green-600">+15.3% from last month</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-2">Pending Verification</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">234</p>
          <p className="text-xs text-red-600">+8.2% from last month</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-xl font-medium text-gray-900">Registered Businesses</h2>

        <div className="flex-1 flex justify-center">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search staff" className="pl-10 bg-white border-gray-200" />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
              Filter
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>All</DropdownMenuItem>
            <DropdownMenuItem>Verified</DropdownMenuItem>
            <DropdownMenuItem>Pending</DropdownMenuItem>
            <DropdownMenuItem>Rejected</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Business Details</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Contact Person</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Industry</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">KYC Status</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Status</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Submission Date</th>
              <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((business, index) => (
              <tr key={index} className="border-b border-gray-200 bg-white">
                <td className="py-4 px-4 text-sm">{business.businessDetails}</td>
                <td className="py-4 px-4">
                  <div className="text-sm">{business.contactPerson}</div>
                  <div className="text-xs text-gray-500">{business.phone}</div>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{business.industry}</td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      business.kycStatus === "Completed"
                        ? "bg-green-100 text-green-700"
                        : business.kycStatus === "Failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {business.kycStatus}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      business.status === "Verified"
                        ? "bg-green-100 text-green-700"
                        : business.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {business.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{business.submissionDate}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
