"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import TextInput from "@/components/TextInput"

export function CallbacksTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className="bg-[#7C3AED] text-white hover:bg-[#6D28D9]">
          <Plus className="w-4 h-4 mr-2" />
          Add Callback
        </Button>
      </div>

      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 space-y-6">
        <div>
          <h3 className="text-base font-medium mb-4">Callback URLs</h3>
          <TextInput placeholder="Callback URL" />
        </div>

        <div>
          <h3 className="text-base font-medium mb-2">Error logs URLs</h3>
          <p className="text-sm text-gray-500 mb-4">
            Receives error notifications when the system encounters errors calling the callback
          </p>
          <TextInput placeholder="Callback URL" />
        </div>
      </div>
    </div>
  )
}
