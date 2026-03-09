"use client"

import type React from "react"
import { useState } from "react"
import { UploadCloud, Check } from "lucide-react"

interface FileUploadProps {
  label: string
  description: string
  onFileSelect?: (file: File) => void
  buttonColor?: string
}

const FileUpload: React.FC<FileUploadProps> = ({ label, description, onFileSelect, buttonColor = "#9A813F" }) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isUploaded, setIsUploaded] = useState(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setIsUploaded(true)
      if (onFileSelect) onFileSelect(file)
    }
  }

  // make a safe id from the label so multiple uploads won't conflict
  const inputId = `file-upload-${label.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
      {/* Left side: circular icon + text */}
      <div className="flex items-center space-x-3 flex-1">
        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
          <UploadCloud className="w-5 h-5 text-gray-900" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
          {fileName && isUploaded && (
            <div className="text-sm mt-1">
              <Check className="w-4 h-4 inline text-green-600 mr-1" />
              <span className="text-green-600">{fileName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right side: upload button */}
      <div>
        <label htmlFor={inputId} className="cursor-pointer">
          <input
            id={inputId}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          <span
            className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors inline-flex items-center"
            style={{ backgroundColor: buttonColor, color: "#fff" }}
          >
            {isUploaded ? "Replace" : "Upload"}
          </span>
        </label>
      </div>
    </div>
  )
}

export default FileUpload
