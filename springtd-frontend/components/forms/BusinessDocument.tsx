"use client";

import React from "react";
import UploadCard from "./UploadCard";

interface Props {
    onContinue: () => void;
}

const BusinessDocument: React.FC<Props> = ({ onContinue }) => {
  const leftList = [
    { id: "coi", title: "COI (certificate of Inc)", hint: "PDF format • Max. 5MB" },
    { id: "shareholders", title: "List of shareholders", hint: "PDF format • Max. 5MB" },
    { id: "bank_statement", title: "Bank Statement", hint: "PDF format • Max. 5MB" },
    { id: "data_privacy", title: "Data & Privacy Policy", hint: "PDF format • Max. 5MB" },
  ];

  const rightList = [
    { id: "article", title: "Article of formation/Association", hint: "PDF format • Max. 5MB" },
    { id: "proof_address", title: "Proof of Address", hint: "PDF format • Max. 5MB" },
    { id: "aml", title: "AML Polices", hint: "PDF format • Max. 5MB" },
  ];

  const handleFile = (key: string, file: File | null) => {
    // handle upload state or call API
    console.log("selected", key, file?.name);
  };

  return (
    <div className="px-12 py-6">
      {/* Header inside big rounded pale card */}
      <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="text-center mb-4">
          <h2 className="text-[24px] font-semibold text-gray-900">Business Document Upload</h2>
          <p className="text-xs text-gray-500 mt-3">Upload company documents</p>
        </div>

        {/* Content area with two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left card: stacked upload rows */}
          <div className="space-y-8">
            {leftList.map((item) => (
              <UploadCard
                key={item.id}
                id={item.id}
                title={item.title}
                hint={item.hint}
                buttonColor="#9A813F"
                onFileSelected={(file) => handleFile(item.id, file)}
              />
            ))}
          </div>

          {/* Right card: stacked upload rows */}
          <div className="space-y-8">
            {rightList.map((item) => (
              <UploadCard
                key={item.id}
                id={item.id}
                title={item.title}
                hint={item.hint}
                buttonColor="#9A813F"
                onFileSelected={(file) => handleFile(item.id, file)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save button aligned to the right (same gold) */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium shadow-sm cursor-pointer"
          style={{ backgroundColor: "#9A813F", color: "#fff" }}
          onClick={onContinue}

        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default BusinessDocument;
