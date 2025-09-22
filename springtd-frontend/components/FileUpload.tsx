'use client';

import React from 'react';
import { Upload, UploadCloud } from 'lucide-react';

interface FileUploadProps {
  label: string;
  description: string;
  onFileSelect?: (file: File) => void;
  buttonColor?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  description,
  onFileSelect,
  buttonColor = '#9A813F',
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
  };

  // make a safe id from the label so multiple uploads won't conflict
  const inputId = `file-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
      {/* Left side: circular icon + text */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
          <UploadCloud className="w-5 h-5 text-gray-900" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
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
            style={{ backgroundColor: buttonColor, color: '#fff' }}
          >
            Upload
          </span>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;
