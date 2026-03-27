"use client"

import { Button } from "@/components/ui/button"
import { Drawer } from "./ui/drawer"

interface SuccessDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
}

export function SuccessDrawer({ open, onOpenChange, email }: SuccessDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="space-y-6 text-center">
        <div>
          <h3 className="text-lg font-semibold">Invitation Successful</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {`you have successfully sent an invite to\n${email || "graceayo@email.com"}`}
          </p>
        </div>
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <Button className="w-full bg-[#9A813F] text-white hover:bg-[#8A7335]" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </Drawer>
  )
}
