"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";

const ShareholderInfo: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    bvn: "",
    bankAccount: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="px-8 py-8">
      <div className="bg-gray-100 rounded-2xl p-10 border border-gray-200 max-w-2xl mx-auto min-h-[700px] flex flex-col">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Shareholders</h2>
          <p className="text-sm text-gray-500 mt-1">Upload company documents</p>
        </div>

        <div className="space-y-6 flex-grow">
          {/* UBO Upload */}
          <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Ultimate Beneficial Owner (UBO)
                </p>
                <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
              style={{ backgroundColor: "#9A813F", color: "#fff" }}
            >
              Upload
            </button>
          </div>

          {/* Input rows styled like upload rows */}
          <div className="border rounded-lg p-5 bg-white shadow-sm">
            <input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="border rounded-lg p-5 bg-white shadow-sm">
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="border rounded-lg p-5 bg-white shadow-sm">
            <input
              type="text"
              placeholder="BVN"
              value={formData.bvn}
              onChange={(e) => handleChange("bvn", e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="border rounded-lg p-5 bg-white shadow-sm">
            <input
              type="text"
              placeholder="Bank Account"
              value={formData.bankAccount}
              onChange={(e) => handleChange("bankAccount", e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Bank Statement Upload */}
          <div className="flex items-center justify-between border rounded-lg p-5 bg-white shadow-sm">
            <div className="flex items-center space-x-3">
              <Upload className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Bank Statement
                </p>
                <p className="text-xs text-gray-500">PDF format • Max. 5MB</p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
              style={{ backgroundColor: "#9A813F", color: "#fff" }}
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareholderInfo;
