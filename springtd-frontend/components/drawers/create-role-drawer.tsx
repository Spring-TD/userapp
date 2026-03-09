"use client"

import React from "react"

import { Button } from "@/components/ui/button"
import { Drawer } from "@/components/drawer"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface CreateRoleDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (roleName: string) => void
}

export function CreateRoleDrawer({ open, onOpenChange, onSuccess }: CreateRoleDrawerProps) {
  const [roleName, setRoleName] = React.useState("")

  const handleCreateRole = () => {
    onSuccess(roleName)
    setRoleName("")
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Create Role" subtitle="Upload company documents">
      <div className="space-y-6">
        <TextInput label="Name of role" placeholder="" value={roleName} onChange={setRoleName} accentColor="#9A813F" />

        <TextInput label="Role Description" placeholder="" accentColor="#9A813F" />

        <InputGroup
          label="Select permission"
          placeholder="Select permission"
          options={["Admin", "Manager", "Support", "View Only"]}
          accentColor="#9A813F"
        />

        <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleCreateRole}>
          Create Role
        </Button>
      </div>
    </Drawer>
  )
}
