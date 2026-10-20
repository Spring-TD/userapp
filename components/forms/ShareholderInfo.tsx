"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy } from "lucide-react"
import { CiMenuKebab } from "react-icons/ci"
import { CreateShareholderDrawer } from "@/components/CreateShareholderDrawer"
import { ComplianceService } from "@/lib/services/complianceService"
import { toast } from "react-toastify"
import { useAuth } from "@/hooks/useAuth"
import { useComplianceForm } from "@/providers/ComplianceFormProvider"
import type { ShareholderRow } from "@/providers/ComplianceFormProvider"
import { Skeleton } from "@/components/ui/skeleton"

export function ShareholderInfo() {
  const { user, loading: authLoading } = useAuth()
  const { shareholders, setShareholders, setShareholderDrawerOpen } = useComplianceForm()
  const [loading, setLoading] = useState(false)

  // Fetch shareholders on mount so the table persists after refresh (merchant or admin)
  useEffect(() => {
    if (authLoading) return
    if (!user) return

    const load = async () => {
      setLoading(true)
      try {
        const list = await ComplianceService.getShareholdersForCurrentMerchant()
        const mapped: ShareholderRow[] = list.map((s: any) => ({
          name: s.fullName || s.name || "Unknown",
          email: s.email || "",
          phone: s.phoneNumber || s.phone || "",
          date: (s.submittedAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
          kyc: "Copy Kyc",
          status:
            s.status === "APPROVED" || s.status === "Successful"
              ? "Successful"
              : s.status === "REJECTED"
                ? "Failed"
                : "Pending",
        }))
        setShareholders(mapped)
      } catch (err: any) {
        console.error("Failed to fetch shareholders", err)
        if (err?.response?.status === 404) {
          setShareholders([])
        } else {
          toast.error("Failed to load shareholders")
          setShareholders([])
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [authLoading, user, setShareholders])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Successful":
        return "bg-green-100 text-green-800"
      case "Failed":
        return "bg-red-100 text-red-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="space-y-3 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShareholderDrawerOpen(true)} className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
          <Copy className="w-4 h-4 mr-2" />
          Create shareholder
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[860px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date/time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shareholders.map((row, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Button variant="ghost" size="sm" className="text-[#2563EB] hover:text-[#1D4ED8]">
                    {row.kyc}
                  </Button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Button variant="ghost" size="sm" className="text-[#2563EB] hover:text-[#1D4ED8]">
                    Upload
                  </Button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge className={getStatusColor(row.status)}>{row.status}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-gray-400 hover:text-gray-600">
                    <CiMenuKebab className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <CreateShareholderDrawer />
    </div>
  )
}

export default ShareholderInfo
