"use client"

import { Button } from "@/components/ui/button"
import { Drawer } from "@/components/drawer"

interface SuccessDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
}

export function SuccessDrawer({ open, onOpenChange, email }: SuccessDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Invitation Successful"
      subtitle={`you have successfully sent an invite to\n${email || "graceayo@email.com"}`}
    >
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <Button className="w-full bg-[#3061F5] text-white hover:bg-[#2451d4]" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </Drawer>
  )
}
