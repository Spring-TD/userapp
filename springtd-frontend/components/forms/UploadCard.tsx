"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Check } from "lucide-react";

export interface UploadCardProps {
  id: string;
  title: string;
  hint?: string;
  accept?: string;
  buttonColor?: string;
  onFileSelected?: (file: File | null) => void;
  error?: boolean;
}

const UploadCard: React.FC<UploadCardProps> = ({
  id,
  title,
  hint = "PDF format • Max. 5MB",
  accept = ".pdf,.png,.jpg,.jpeg",
  buttonColor = "#9A813F",
  onFileSelected,
  error = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFileName(file?.name ?? null);
    setIsUploaded(Boolean(file));
    onFileSelected?.(file);
  };

  return (
    <div className="w-full px-8">
      <div
        className={`flex items-center justify-between gap-4 bg-white rounded-lg p-5 border ${
          error
            ? "border-red-400"
            : "border-gray-100"
        }`}
      >
        {/* Left: icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
            <UploadCloud
              className={error ? "text-gray-600" : "text-gray-600"}
              size={20}
            />
          </div>

          {/* Title + hint */}
          <div className="min-w-0">
            <div
              className={`text-sm font-medium truncate ${
                error ? "text-gray-900" : "text-gray-900"
              }`}
            >
              {title}
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">{hint}</div>

            {fileName && (
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                {isUploaded && !error ? (
                  <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="truncate">{fileName}</span>
                  </>
                ) : (
                  <span className="truncate">{fileName}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: button */}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={accept}
            className="hidden"
            onChange={onChange}
          />
          <button
            type="button"
            onClick={handleClick}
            aria-label={`${isUploaded ? "Replace" : "Upload"} ${title}`}
            className={`text-sm text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors cursor-pointer ${
              error ? "bg-[#9A813F] hover:bg-[#9A813F]" : ""
            }`}
            style={!error ? { backgroundColor: buttonColor, color: "#fff" } : {}}
          >
            {isUploaded ? "Replace" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadCard;
