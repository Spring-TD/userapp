"use client"
import type React from "react"
import { useRef, useState, useEffect } from "react"
import { UploadCloud, Check } from "lucide-react"

export interface UploadCardProps {
  id: string
  title: string
  hint?: string
  accept?: string
  buttonColor?: string
  onFileSelected?: (file: File | null) => void
  error?: boolean
  initialFile?: File | null
}

const UploadCard: React.FC<UploadCardProps> = ({
  id,
  title,
  hint = "PDF format • Max. 5MB",
  accept = ".pdf,.png,.jpg,.jpeg",
  buttonColor = "#7C3AED",
  onFileSelected,
  error = false,
  initialFile = null,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(initialFile?.name ?? null)
  const [isUploaded, setIsUploaded] = useState(Boolean(initialFile))

  // Update state when initialFile changes (e.g., when context updates)
  useEffect(() => {
    setFileName(initialFile?.name ?? null)
    setIsUploaded(Boolean(initialFile))
  }, [initialFile])

  const handleClick = () => inputRef.current?.click()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setFileName(file?.name ?? null)
    setIsUploaded(Boolean(file))
    onFileSelected?.(file)
  }

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
        error ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      {/* Left: icon */}
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${error ? "bg-red-100" : "bg-gray-100"}`}
        >
          <UploadCloud className={`w-6 h-6 ${error ? "text-red-600" : "text-gray-600"}`} />
        </div>

        {/* Title + hint */}
        <div className="flex-1">
          <div className={`font-medium ${error ? "text-red-900" : "text-gray-900"}`}>{title}</div>
          <div className="text-sm text-gray-500">{hint}</div>
          {fileName && (
            <div className="text-sm mt-1">
              {isUploaded && !error ? (
                <>
                  <Check className="w-4 h-4 inline text-green-600 mr-1" />
                  <span className="text-green-600">{fileName}</span>
                </>
              ) : (
                <span className="text-gray-600">{fileName}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: button */}
      <button
        type="button"
        onClick={handleClick}
        className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition"
        style={{ backgroundColor: buttonColor }}
      >
        {isUploaded ? "Replace" : "Upload"}
      </button>

      <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" />
    </div>
  )
}

export default UploadCard
