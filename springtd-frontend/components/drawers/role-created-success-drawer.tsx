"use client"

import { Button } from "@/components/ui/button"
import { Drawer } from "@/components/drawer"

interface RoleCreatedSuccessDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleName: string
}

export function RoleCreatedSuccessDrawer({ open, onOpenChange, roleName }: RoleCreatedSuccessDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="" subtitle="">
      <div className="flex flex-col items-center justify-center space-y-6 text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Role Created Successfully</h3>
          <p className="text-sm text-gray-600">
            You have successfully created the role:
            <br />
            {roleName || "New Role"}
          </p>
        </div>

        <Button className="w-full bg-[#9A813F] text-white hover:bg-[#8A7335]" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </Drawer>
  )
}
