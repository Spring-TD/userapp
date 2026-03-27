"use client"

import type React from "react"

interface TextInputProps {
  label?: string
  placeholder: string
  value?: string
  onChange?: (value: string) => void
  type?: "text" | "email" | "url"
  accentColor?: string
}

const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  accentColor = "#9A813F",
  type = "text",
}) => {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-600">{label}</label>}
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[60px] px-4 border rounded-lg focus:outline-none focus:ring-2 text-gray-900 bg-white"
        style={{
          borderColor: "#D1D5DB",
          outlineColor: accentColor,
        }}
      />
    </div>
  )
}

export default TextInput
