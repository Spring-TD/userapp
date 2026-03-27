"use client"

import { Button } from "@/components/ui/button"
import { Plus, Search, Edit, Trash2 } from "lucide-react"

export interface CreateRoleTabProps {
  onCreateRole?: () => void
}

export function CreateRoleTab({ onCreateRole }: CreateRoleTabProps) {

  const roles = [
    {
      id: "1",
      name: "Financial Manager",
      createdBy: "Admin",
      permissions: "View permission",
    },
    {
      id: "2",
      name: "Account officer",
      createdBy: "Admin",
      permissions: "View permission",
    },
    {
      id: "3",
      name: "Auditor",
      createdBy: "Admin",
      permissions: "View permission",
    },
    {
      id: "4",
      name: "Financial Manager",
      createdBy: "Admin",
      permissions: "View permission",
    },
    {
      id: "5",
      name: "Auditor",
      createdBy: "Admin",
      permissions: "View permission",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className="bg-black text-white hover:bg-gray-800" onClick={onCreateRole}>
          <Plus className="w-4 h-4 mr-2" />
          Create roles
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium">Roles</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search roles"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
            <div>Name of roles</div>
            <div>created by</div>
            <div>Permissions</div>
            <div>Actions</div>
          </div>
          {roles.map((role) => (
            <div key={role.id} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 last:border-b-0 text-sm">
              <div className="font-medium">{role.name}</div>
              <div>{role.createdBy}</div>
              <div>
                <Button variant="outline" size="sm" className="text-[#9A813F] border-[#9A813F] bg-transparent">
                  {role.permissions}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
