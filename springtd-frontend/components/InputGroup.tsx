"use client"

import type React from "react"
import { ChevronDown } from "lucide-react"

interface InputGroupProps {
  label: string
  placeholder: string
  options?: string[]
  value?: string
  onChange?: (value: string) => void
  accentColor?: string
}

const InputGroup: React.FC<InputGroupProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  accentColor = "#9A813F",
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full px-4 py-5 border border-gray-300 rounded-lg bg-white appearance-none text-gray-900 focus:outline-none focus:ring-2"
          style={{
            borderColor: "#D1D5DB",
            outlineColor: accentColor,
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options?.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
          size={20}
        />
      </div>
    </div>
  )
}

export default InputGroup
