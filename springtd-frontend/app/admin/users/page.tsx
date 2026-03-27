"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, Loader2, RefreshCw, UserX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { adminUsersApi, AdminUser } from "@/lib/adminService"
import { toast } from "sonner"

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
  Suspended: "bg-red-100 text-red-700",
  Inactive: "bg-gray-100 text-gray-600",
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")

  const fetchUsers = async () => {
    setLoading(true)
    const res = await adminUsersApi.getAllUsers()
    if (res.success && res.data) {
      setUsers(res.data)
    } else {
      // API unavailable — show empty state, don't use fake data
      setUsers([])
      if (res.error) console.warn("[AdminUsers] API unavailable:", res.error)
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const displayUsers = users
    .filter(u => statusFilter === "All" || u.status === statusFilter)
    .filter(u => {
      const q = searchQuery.toLowerCase()
      return (
        (u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      )
    })

  const getUserDisplayName = (u: AdminUser) =>
    (u.name ?? [u.firstName, u.lastName].filter(Boolean).join(" ")) || "—"

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"

  return (
    <div className="flex-1 bg-white p-8">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-normal text-gray-900">Users</h1>

        <div className="flex-1 flex justify-center">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-10 bg-white border-gray-200"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={fetchUsers}
          className="text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 bg-transparent">
              {statusFilter}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["All", "Active", "Pending", "Suspended"].map(s => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-gray-50 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : displayUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UserX className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              {searchQuery || statusFilter !== "All"
                ? "No users match your filters."
                : "No users found. API may be unavailable."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Name</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Role</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Email</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Last Login</th>
                <th className="text-left py-4 px-4 text-sm font-normal text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium">{getUserDisplayName(user)}</td>
                  <td className="py-4 px-4 text-sm text-gray-600 capitalize">{user.role}</td>
                  <td className="py-4 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{formatDate(user.lastLogin)}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[user.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
