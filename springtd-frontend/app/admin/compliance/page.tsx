"use client"

import { useState } from "react"
import { Search, ChevronDown, Eye, MoreVertical, AlertTriangle, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function AdminCompliancePage() {
  const [activeTab, setActiveTab] = useState("compliance")

  const kycQueue = [
    {
      customer: "Grace Ayomide",
      documentType: "National ID",
      submissionDate: "Sept 19, 2025",
      status: "Rejected",
      riskLevel: "High risk",
      assignTo: "Chidi oli",
    },
    {
      customer: "Chidi Obi",
      documentType: "Drivers linenses",
      submissionDate: "Sept 19, 2025",
      status: "Under review",
      riskLevel: "Medium",
      assignTo: "Adedayo",
    },
    {
      customer: "Grace Ayomide",
      documentType: "National ID",
      submissionDate: "Sept 19, 2025",
      status: "Approved",
      riskLevel: "Low",
      assignTo: "Chidi oli",
    },
    {
      customer: "Chidi Obi",
      documentType: "Drivers linenses",
      submissionDate: "Sept 19, 2025",
      status: "Rejected",
      riskLevel: "High risk",
      assignTo: "Adedayo",
    },
  ]

  return (
    <div className="flex-1 bg-white">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-8">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("compliance")}
            className={`py-4 text-sm relative ${
              activeTab === "compliance" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Compliance Management
            {activeTab === "compliance" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-4 text-sm relative ${
              activeTab === "chat" ? "text-[#3061F5]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Chat Reviews
            {activeTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3061F5]" />}
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Alert Cards */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-start gap-4">
            <div className="bg-[#3061F5] rounded-full p-3">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-[#3061F5] mb-1">Review Required</h3>
              <p className="text-sm text-blue-700">87 KYC applications are pending review (SLA: 24 hours)</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
            <div className="bg-red-600 rounded-full p-3">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-red-600 mb-1">Critical Alert</h3>
              <p className="text-sm text-red-700">3 high-risk AML cases require immediate attention</p>
            </div>
          </div>
        </div>

        {/* Stats Cards and Buttons on same row */}
        <div className="flex items-center gap-6 mb-8">
          {/* Stats Cards - narrower width */}
          <div className="flex gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 w-64">
              <p className="text-sm text-gray-600 mb-2">KYC Completion Rate</p>
              <p className="text-4xl font-bold text-gray-900">45</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 w-64">
              <p className="text-sm text-gray-600 mb-2">AML Alerts</p>
              <p className="text-4xl font-bold text-gray-900">5</p>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Button className="bg-[#3061F5] hover:bg-[#2451d4] text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
              >
                <path
                  d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.66667 6.66667L8 10L11.3333 6.66667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10V2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export Report
            </Button>
            <Button className="bg-[#3061F5] hover:bg-[#2451d4] text-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2"
              >
                <path
                  d="M14 6V3.33333C14 2.97971 13.8595 2.64057 13.6095 2.39052C13.3594 2.14048 13.0203 2 12.6667 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.3333 9.33333L8 6L4.66667 9.33333"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 6V14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generate Report
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-6">
          <h2 className="text-xl font-medium text-gray-900 whitespace-nowrap">KYC Verification Queue</h2>

          <div className="flex-1 flex justify-center">
            <div className="w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search" className="pl-10 bg-white border-gray-200" />
              </div>
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
              <DropdownMenuItem>Approved</DropdownMenuItem>
              <DropdownMenuItem>Under review</DropdownMenuItem>
              <DropdownMenuItem>Rejected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Costumer</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Document type</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Submission date</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Status</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Risk level</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Assign to</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kycQueue.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 bg-white">
                  <td className="py-4 px-4 text-sm">{item.customer}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{item.documentType}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{item.submissionDate}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        item.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : item.status === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                        item.riskLevel === "Low"
                          ? "bg-green-100 text-green-700"
                          : item.riskLevel === "High risk"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {item.riskLevel}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">{item.assignTo}</td>
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
    </div>
  )
}
