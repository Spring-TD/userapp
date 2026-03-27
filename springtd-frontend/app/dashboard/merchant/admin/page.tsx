'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Users, UserCheck, UserX, Plus } from 'lucide-react'
import { AddStaffModal } from '@/components/admin/add-staff-modal'
import { CreateRoleModal } from '@/components/admin/create-role-modal'
import { SuccessModal } from '@/components/admin/success-modal'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('add-staff')
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false)
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<{
    title: string
    message: string
  } | null>(null)

  // Sample staff data
  const staffData = [
    {
      name: 'Grace Ayomide',
      role: 'Admin',
      email: 'Graceayo@email.com',
      lastLogin: 'Sept 19, 2025 10:11:23',
      status: 'Active',
    },
    {
      name: 'Chidi Obi',
      role: 'Admin',
      email: 'chidiobi@email.com',
      lastLogin: 'Sept 19, 2025 10:11:23',
      status: 'Pending',
    },
    {
      name: 'Grace Ayomide',
      role: 'Admin',
      email: 'Graceayo@email.com',
      lastLogin: 'Sept 19, 2025 10:11:23',
      status: 'Suspended',
    },
    {
      name: 'Chidi Obi',
      role: 'Admin',
      email: 'chidiobi@email.com',
      lastLogin: 'Sept 19, 2025 10:11:23',
      status: 'Active',
    },
  ]

  // Sample roles data
  const rolesData = [
    {
      name: 'Financial Manager',
      createdBy: 'Admin',
    },
    {
      name: 'Account officer',
      createdBy: 'Admin',
    },
    {
      name: 'Auditor',
      createdBy: 'Admin',
    },
    {
      name: 'Financial Manager',
      createdBy: 'Admin',
    },
    {
      name: 'Auditor',
      createdBy: 'Admin',
    },
  ]

  const handleInviteSuccess = (email: string) => {
    setIsAddStaffModalOpen(false)
    setSuccessMessage({
      title: 'Invitation Successful',
      message: `you have successfully sent an invite to ${email}`,
    })
  }

  const handleRoleCreateSuccess = () => {
    setIsCreateRoleModalOpen(false)
    setSuccessMessage({
      title: 'Role created',
      message: 'you have successfully created a role',
    })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin</h1>
        <p className="text-muted-foreground">Manage your API credentials, products, and integration settings</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-transparent p-0 h-auto border-b border-gray-200">
          <TabsTrigger
            value="add-staff"
            className="px-0 py-3 mr-8 rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:text-[#7C3AED] data-[state=inactive]:text-gray-600"
          >
            Add staff
          </TabsTrigger>
          <TabsTrigger
            value="manage-role"
            className="px-0 py-3 mr-8 rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:text-[#7C3AED] data-[state=inactive]:text-gray-600"
          >
            Manage role
          </TabsTrigger>
          <TabsTrigger
            value="suspend-staff"
            className="px-0 py-3 mr-8 rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:text-[#7C3AED] data-[state=inactive]:text-gray-600"
          >
            Suspend staff
          </TabsTrigger>
          <TabsTrigger
            value="create-role"
            className="px-0 py-3 rounded-none bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-[#7C3AED] data-[state=active]:bg-transparent data-[state=active]:text-[#7C3AED] data-[state=inactive]:text-gray-600"
          >
            Create role
          </TabsTrigger>
        </TabsList>

        {/* Add Staff Tab */}
        <TabsContent value="add-staff" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#7C3AED] rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6" />
                <span className="text-4xl font-bold">4</span>
              </div>
              <p className="text-white/90">Staff Accounts</p>
            </div>
            <div className="bg-[#7C3AED] rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="w-6 h-6" />
                <span className="text-4xl font-bold">3</span>
              </div>
              <p className="text-white/90">Active Staff Accounts</p>
            </div>
            <div className="bg-[#7C3AED] rounded-lg p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <UserX className="w-6 h-6" />
                <span className="text-4xl font-bold">1</span>
              </div>
              <p className="text-white/90">Inactive Staff Accounts</p>
            </div>
          </div>

          {/* Staff Accounts Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Staff Accounts</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search staff" className="pl-10 w-[300px]" />
                </div>
                <Select defaultValue="status">
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Role</th>
                    <th className="text-left p-4 font-medium text-gray-700">Email</th>
                    <th className="text-left p-4 font-medium text-gray-700">Last Login</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((staff, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-4">{staff.name}</td>
                      <td className="p-4">{staff.role}</td>
                      <td className="p-4">{staff.email}</td>
                      <td className="p-4">{staff.lastLogin}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-sm ${
                            staff.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : staff.status === 'Pending'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Manage Role Tab */}
        <TabsContent value="manage-role" className="mt-6 space-y-6">
          {/* Staff Accounts Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Staff Accounts</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search staff" className="pl-10 w-[300px]" />
                </div>
                <Select defaultValue="status">
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Role</th>
                    <th className="text-left p-4 font-medium text-gray-700">Email</th>
                    <th className="text-left p-4 font-medium text-gray-700">Last Login</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((staff, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-4">{staff.name}</td>
                      <td className="p-4">{staff.role}</td>
                      <td className="p-4">{staff.email}</td>
                      <td className="p-4">{staff.lastLogin}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-sm ${
                            staff.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : staff.status === 'Pending'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roles Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Roles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-lg p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Admin</h3>
                <p className="text-white/90 text-sm mb-4">
                  Manage all settings, staff, compliance, and finances.
                </p>
                <Button variant="secondary" size="sm" className="bg-white text-[#7C3AED] hover:bg-white/90">
                  View permission
                </Button>
              </div>

              <div className="bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-lg p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Manager</h3>
                <p className="text-white/90 text-sm mb-4">
                  Manage all settings, staff, compliance, and finances.
                </p>
                <Button variant="secondary" size="sm" className="bg-white text-[#7C3AED] hover:bg-white/90">
                  View permission
                </Button>
              </div>

              <div className="bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] rounded-lg p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Support Staff</h3>
                <p className="text-white/90 text-sm mb-4">
                  Manage all settings, staff, compliance, and finances.
                </p>
                <Button variant="secondary" size="sm" className="bg-white text-[#7C3AED] hover:bg-white/90">
                  View permission
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Suspend Staff Tab */}
        <TabsContent value="suspend-staff" className="mt-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Suspended Staff</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search staff" className="pl-10 w-[300px]" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="older">Older</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Name</th>
                    <th className="text-left p-4 font-medium text-gray-700">Role</th>
                    <th className="text-left p-4 font-medium text-gray-700">Email</th>
                    <th className="text-left p-4 font-medium text-gray-700">Suspended Date</th>
                    <th className="text-left p-4 font-medium text-gray-700">Status</th>
                    <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-4">Grace Ayomide</td>
                    <td className="p-4">Admin</td>
                    <td className="p-4">Graceayo@email.com</td>
                    <td className="p-4">Sept 15, 2025 14:30:12</td>
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        Unsuspend
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4">Tunde Bakare</td>
                    <td className="p-4">Manager</td>
                    <td className="p-4">tundebakare@email.com</td>
                    <td className="p-4">Sept 10, 2025 09:15:45</td>
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        Unsuspend
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4">Amaka Okafor</td>
                    <td className="p-4">Support</td>
                    <td className="p-4">amakaokafor@email.com</td>
                    <td className="p-4">Sept 8, 2025 16:22:33</td>
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        Unsuspend
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4">Emeka Nwosu</td>
                    <td className="p-4">Admin</td>
                    <td className="p-4">emekanwosu@email.com</td>
                    <td className="p-4">Sept 5, 2025 11:45:20</td>
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        Unsuspend
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-4">Fatima Abdullahi</td>
                    <td className="p-4">Manager</td>
                    <td className="p-4">fatimaabdullahi@email.com</td>
                    <td className="p-4">Sept 3, 2025 13:10:55</td>
                    <td className="p-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-sm bg-red-100 text-red-700">
                        Suspended
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                        Unsuspend
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Create Role Tab */}
        <TabsContent value="create-role" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Roles</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search roles" className="pl-10 w-[300px]" />
              </div>
              <Select defaultValue="status">
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setIsCreateRoleModalOpen(true)}
                className="bg-black hover:bg-black/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create roles
              </Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">Name of roles</th>
                  <th className="text-left p-4 font-medium text-gray-700">created by</th>
                  <th className="text-left p-4 font-medium text-gray-700">Permissions</th>
                  <th className="text-left p-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rolesData.map((role, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-4">{role.name}</td>
                    <td className="p-4">{role.createdBy}</td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]">
                        View permission
                      </Button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddStaffModal
        isOpen={isAddStaffModalOpen}
        onClose={() => setIsAddStaffModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />

      <CreateRoleModal
        isOpen={isCreateRoleModalOpen}
        onClose={() => setIsCreateRoleModalOpen(false)}
        onSuccess={handleRoleCreateSuccess}
      />

      {successMessage && (
        <SuccessModal
          isOpen={!!successMessage}
          onClose={() => setSuccessMessage(null)}
          title={successMessage.title}
          message={successMessage.message}
        />
      )}
    </div>
  )
}
