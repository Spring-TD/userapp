"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Search } from "lucide-react"

export interface AddStaffTabProps {
  onAddStaff?: () => void
}

export function AddStaffTab({ onAddStaff }: AddStaffTabProps) {

  const staffAccounts = [
    {
      id: "1",
      name: "Grace Ayomide",
      role: "Admin",
      email: "Graceayo@email.com",
      lastLogin: "Sept 19, 2025 10:11:23",
      status: "Active",
    },
    {
      id: "2",
      name: "Chidi Obi",
      role: "Admin",
      email: "chidiobi@email.com",
      lastLogin: "Sept 19, 2025 10:11:23",
      status: "Pending",
    },
    {
      id: "3",
      name: "Grace Ayomide",
      role: "Admin",
      email: "Graceayo@email.com",
      lastLogin: "Sept 19, 2025 10:11:23",
      status: "Suspended",
    },
    {
      id: "4",
      name: "Chidi Obi",
      role: "Admin",
      email: "chidiobi@email.com",
      lastLogin: "Sept 19, 2025 10:11:23",
      status: "Active",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-orange-100 text-orange-800"
      case "Suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">4</div>
                <div className="text-sm text-gray-600">Staff Accounts</div>
              </div>
            </div>
          </div>
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">3</div>
                <div className="text-sm text-gray-600">Active Staff Accounts</div>
              </div>
            </div>
          </div>
          <div className="bg-[#9A813F33] rounded-lg p-6">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-[#9A813F]" />
              <div>
                <div className="text-2xl font-bold text-gray-900">1</div>
                <div className="text-sm text-gray-600">Inactive Staff Accounts</div>
              </div>
            </div>
          </div>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800 ml-6" onClick={onAddStaff}>
          <Users className="w-4 h-4 mr-2" />
          Add Admin
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Staff Accounts</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search staff"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Status</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Name</div>
            <div>Role</div>
            <div>Email</div>
            <div>Last Login</div>
            <div>Status</div>
          </div>
          {staffAccounts.map((staff) => (
            <div key={staff.id} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm">
              <div className="font-medium">{staff.name}</div>
              <div>{staff.role}</div>
              <div>{staff.email}</div>
              <div>{staff.lastLogin}</div>
              <div>
                <Badge className={getStatusColor(staff.status)}>{staff.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
