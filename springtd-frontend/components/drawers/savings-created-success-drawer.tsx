"use client"

import { CheckCircle } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"

interface SavingsCreatedSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
  accentColor?: string
}

export default function SavingsCreatedSuccessDrawer({ isOpen, onClose, accentColor = "#9A813F" }: SavingsCreatedSuccessDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose} title="" subtitle="">
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="text-green-600" size={32} />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Savings created successfully</h2>
        <p className="text-sm text-gray-600 mb-8">Your product has been created</p>

        <Button 
          onClick={onClose} 
          className="text-white px-12 h-12"
          style={{ backgroundColor: accentColor }}
        >
          Continue
        </Button>
      </div>
    </Drawer>
  )
}
