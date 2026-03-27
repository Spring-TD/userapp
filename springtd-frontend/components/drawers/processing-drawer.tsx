"use client"

import { Drawer } from "@/components/drawer"

interface ProcessingDrawerProps {
  isOpen: boolean
}

export default function ProcessingDrawer({ isOpen }: ProcessingDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={() => {}} title="" subtitle="">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 border-4 border-[#9A813F] border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-lg font-medium text-gray-900">processing</p>
      </div>
    </Drawer>
  )
}
