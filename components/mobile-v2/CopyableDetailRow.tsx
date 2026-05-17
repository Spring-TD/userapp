"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

export function CopyableDetailRow({
  label,
  value,
  placeholder = "—",
}: {
  label: string
  value?: string | null
  placeholder?: string
}) {
  const display = value?.trim() || placeholder
  const canCopy = Boolean(value?.trim())

  const copy = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(value!.trim())
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <div className="flex justify-between items-center gap-3">
        <span className={`font-bold ${canCopy ? "text-[var(--sf-ink,#1E1B4B)]" : "text-gray-500"}`}>
          {display}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!canCopy}
          className="shrink-0 disabled:opacity-30"
          aria-label={`Copy ${label}`}
        >
          <Copy className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

