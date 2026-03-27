"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import { Drawer } from "@/components/drawer"
import TextInput from "@/components/text-input"

interface AddStaffDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (email: string) => void
}

export function AddStaffDrawer({ open, onOpenChange, onSuccess }: AddStaffDrawerProps) {
  const [selectedRole, setSelectedRole] = useState("Admin")
  const [staffEmail, setStaffEmail] = useState("")

  const handleInvite = () => {
    onSuccess(staffEmail)
    setStaffEmail("")
    setSelectedRole("Admin")
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Add Staff" subtitle="Upload company documents">
      <div className="space-y-6">
        <div className="w-12 h-12 bg-[#E0D8C3] rounded-full flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-[#9A813F]" />
        </div>

        <TextInput
          label="Staff Email Address"
          placeholder="Enter staff email address"
          value={staffEmail}
          onChange={setStaffEmail}
          type="email"
          accentColor="#9A813F"
        />

        <div className="space-y-3">
          <label className="text-sm text-gray-600">Select Role</label>
          <div className="space-y-3">
            {["Admin", "Manager", "Support", "Customer"].map((role) => (
              <label key={role} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-4 h-4 text-[#9A813F] border-gray-300 focus:ring-[#9A813F]"
                />
                <span className="text-sm text-gray-700">{role}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="text-sm text-[#9A813F] flex items-center">
          <Plus className="w-4 h-4 mr-1" />
          Send another invite
        </button>

        <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleInvite}>
          Invite
        </Button>
      </div>
    </Drawer>
  )
}
