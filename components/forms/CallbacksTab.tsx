"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import TextInput from "@/components/TextInput"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"

export function CallbacksTab() {
  const [callbackUrl, setCallbackUrl] = useState(WEBSITE_URL_PREFIX)
  const [errorLogUrl, setErrorLogUrl] = useState(WEBSITE_URL_PREFIX)

  const handleUrlChange = (setter: (v: string) => void) => (v: string) => {
    const next = (v.startsWith("https://") || v.startsWith("http://") || v === "") ? v : WEBSITE_URL_PREFIX + v
    setter(next)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div></div>
        <Button className="bg-black text-white hover:bg-gray-800">
          <Plus className="w-4 h-4 mr-2" />
          Add Callback
        </Button>
      </div>

      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 space-y-6">
        <div>
          <h3 className="text-base font-medium mb-4">Callback URLs</h3>
          <TextInput placeholder="example.com" type="url" value={callbackUrl} onChange={handleUrlChange(setCallbackUrl)} />
        </div>

        <div>
          <h3 className="text-base font-medium mb-2">Error logs URLs</h3>
          <p className="text-sm text-gray-500 mb-4">
            Receives error notifications when the system encounters errors calling the callback
          </p>
          <TextInput placeholder="example.com" type="url" value={errorLogUrl} onChange={handleUrlChange(setErrorLogUrl)} />
        </div>
      </div>
    </div>
  )
}
