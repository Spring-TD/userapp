"use client"

import { Button } from "@/components/ui/button"
import { Drawer } from "./ui/drawer"
import TextInput from "./TextInput"
import InputGroup from "./InputGroup"

interface CreateRoleDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRoleDrawer({ open, onOpenChange }: CreateRoleDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6">
        <TextInput label="Name of role" placeholder="" accentColor="#9A813F" />

        <TextInput label="Role Description" placeholder="" accentColor="#9A813F" />

        <InputGroup
          label="Select permission"
          placeholder="Select permission"
          options={["Admin", "Manager", "Support", "View Only"]}
          accentColor="#9A813F"
        />

        <Button className="w-full bg-black text-white hover:bg-gray-800">Create Role</Button>
      </div>
    </Drawer>
  )
}
