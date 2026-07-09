"use client"

import { useCallback, useRef } from "react"

export function PinInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  autoFocus = false,
  idPrefix = "pin",
}: {
  value: string
  onChange: (next: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  idPrefix?: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const digits = value.padEnd(length, " ").slice(0, length).split("")

  const setDigit = useCallback(
    (index: number, char: string) => {
      const clean = char.replace(/\D/g, "").slice(-1)
      const arr = value.padEnd(length, " ").slice(0, length).split("")
      arr[index] = clean || ""
      const next = arr.join("").replace(/\s/g, "")
      onChange(next.slice(0, length))
      if (clean && index < length - 1) {
        refs.current[index + 1]?.focus()
      }
    },
    [length, onChange, value],
  )

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pasted) onChange(pasted)
  }

  return (
    <div className="flex justify-center gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          id={`${idPrefix}-${i}`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={digits[i]?.trim() || ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-xl border border-[#E5E7EB] bg-white text-center text-lg font-semibold text-[#111827] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 disabled:opacity-50"
          aria-label={`PIN digit ${i + 1}`}
        />
      ))}
    </div>
  )
}
