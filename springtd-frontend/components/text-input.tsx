"use client"

import type React from "react"
import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"

interface TextInputProps {
  label?: string
  placeholder: string
  value?: string
  onChange?: (value: string) => void
  type?: "text" | "email" | "url" | "password"
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
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = type === "password"
  const inputType = isPasswordField ? (showPassword ? "text" : "password") : type

  return (
    <div className="space-y-2">
      {label && <label className="text-sm text-gray-600">{label}</label>}
      <div className="relative">
        <input
          type={inputType}
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[60px] px-4 border rounded-lg focus:outline-none focus:ring-2 text-gray-900 bg-white"
          style={{
            borderColor: "#D1D5DB",
            outlineColor: accentColor,
          }}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

export default TextInput
