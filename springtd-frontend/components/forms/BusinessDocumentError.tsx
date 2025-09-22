"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import UploadCard from "./UploadCard";

const BusinessDocumentWithError: React.FC = () => {
  const leftList = [
    { id: "coi", title: "COI (certificate of Inc)" },
    { id: "shareholders", title: "List of shareholders", error: true },
    { id: "bank_statement", title: "Bank Statement" },
    { id: "data_privacy", title: "Data & Privacy Policy" },
  ];

  const rightList = [
    { id: "article", title: "Article of formation/Association" },
    { id: "proof_address", title: "Proof of Address" },
    { id: "aml", title: "AML Polices" },
  ];

  return (
    <div className="px-8 py-6 space-y-4">
      {/* Warning Banner */}
      <div className="flex justify-center items-center bg-yellow-50 border-l-4 border-[#AF4949] p-4 rounded-md">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <p className="text-sm text-gray-700">
          We noticed some error or mistakes in the list of shareholders you uploaded
        </p>
      </div>

      {/* Document Upload Section */}
      <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="text-center mb-4">
          <h2 className="text-[24px] font-semibold text-gray-900">
            Business Document Upload
          </h2>
          <p className="text-xs text-gray-500 mt-1">Upload company documents</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {leftList.map((item) => (
              <UploadCard
                key={item.id}
                id={item.id}
                title={item.title}
                buttonColor={item.error ? "#DC2626" : "#9A813F"} // red if error, gold otherwise
                error={item.error}
              />
            ))}
          </div>
          <div className="space-y-4">
            {rightList.map((item) => (
              <UploadCard
                key={item.id}
                id={item.id}
                title={item.title}
                buttonColor="#9A813F"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDocumentWithError;
