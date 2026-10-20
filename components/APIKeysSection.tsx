"use client"

import { Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface APIKey {
  id: string
  name: string
  createdAt: string
}

interface APIKeysSectionProps {
  onGenerateNewKey?: () => void
  onCopyKey?: (keyName: string) => void
  onDeleteKey?: (keyId: string) => void
  keys?: APIKey[]
  className?: string
}

const defaultKeys: APIKey[] = [
  {
    id: "1",
    name: "Production Key",
    createdAt: "Dec 1, 2025"
  },
  {
    id: "2", 
    name: "Development Key",
    createdAt: "Dec 5, 2025"
  },
  {
    id: "3",
    name: "Production Key", 
    createdAt: "Dec 8, 2025"
  }
]

export default function APIKeysSection({
  onGenerateNewKey,
  onCopyKey,
  onDeleteKey,
  keys = defaultKeys,
  className = ""
}: APIKeysSectionProps) {
  const handleCopy = (keyName: string) => {
    if (onCopyKey) {
      onCopyKey(keyName)
    } else {
      // Default copy behavior
      navigator.clipboard.writeText("sample-api-key").catch(() => {
        console.error("Failed to copy to clipboard")
      })
    }
  }

  const handleDelete = (keyId: string) => {
    if (onDeleteKey) {
      onDeleteKey(keyId)
    } else {
      // Default delete behavior
      console.log("Delete key:", keyId)
    }
  }

  return (
    <section className={className}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500">Manage your API keys for integration</p>
        </div>
        <Button
          type="button"
          className="bg-[#7F56D9] text-white hover:bg-[#6941C6] rounded-md px-6 shrink-0 w-full sm:w-auto"
          onClick={onGenerateNewKey}
        >
          Generate New Key
        </Button>
      </div>
      <div className="bg-[#F0F2F5] rounded-lg border border-gray-200/80 p-6 space-y-4">
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex justify-between items-center gap-4 bg-white p-4 rounded-md border border-gray-200 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{key.name}</p>
              <p className="text-sm text-gray-500">Created {key.createdAt}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Copy key"
                onClick={() => handleCopy(key.name)}
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete key"
                onClick={() => handleDelete(key.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-4">
        For credentials tied to a specific application, open it from{" "}
        <strong className="font-medium text-gray-700">All Apps</strong>, then use{" "}
        <strong className="font-medium text-gray-700">Settings</strong> in the app sidebar.
      </p>
    </section>
  )
}
