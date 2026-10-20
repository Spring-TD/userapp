"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import UploadCard from "./UploadCard";
import { fileToBase64 } from "@/lib/fileUtils";
import { submitBusinessKyc } from "@/lib/services/kycService";
import { toast } from "react-toastify";
import { useComplianceForm } from "@/providers/ComplianceFormProvider";

interface Props {
  missingIds?: string[];
}

const BusinessDocumentWithError: React.FC<Props> = ({ missingIds = [] }) => {
  const { merchantBusinessSurvey: info } = useComplianceForm();
  const [selected, setSelected] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const leftList = [
    { id: "coi", title: "COI (certificate of Inc)" },
    { id: "shareholders", title: "List of shareholders" },
    { id: "bank_statement", title: "Bank Statement" },
    { id: "data_privacy", title: "Data & Privacy Policy" },
  ];

  const rightList = [
    { id: "article", title: "Article of formation/Association" },
    { id: "proof_address", title: "Proof of Address" },
    { id: "aml", title: "AML Polices" },
  ];

  const allIds = useMemo(() => [...leftList, ...rightList].map((i) => i.id), []);

  const markError = (id: string) => {
    // Show red if it was missing when we arrived OR still not selected
    if (missingIds.includes(id)) return true;
    return !selected[id];
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      if (!info.businessName?.trim() || !info.country?.trim()) {
        toast.error("Please fill Business Info before uploading documents.");
        return;
      }

      // build documents from selected
      const entries = Object.entries(selected).filter(([, f]) => !!f) as Array<[string, File]>;
      const documents: Array<{ type: string; fileName: string; fileType: string; fileSize: number; fileData: string }> = [];
      for (const [key, f] of entries) {
        const base64 = await fileToBase64(f);
        documents.push({ type: key, fileName: f.name, fileType: f.type, fileSize: f.size, fileData: base64 });
      }

      if (documents.length === 0) {
        toast.error("Please upload at least one required document.");
        return;
      }

      if (!info.businessName || !info.companyRegId || !info.country) {
        toast.error("Business name, company reg. ID and country are required.");
        return;
      }

      const payload = {
        businessInfo: {
          businessName: info.businessName,
          businessType: info.businessType || "UNKNOWN",
          registrationNumber: info.companyRegId,
          industry: info.industry || "",
          address: {
            street: "",
            city: info.userBase || "",
            state: "",
            postalCode: "",
            country: info.country || "NG",
          },
        },
        beneficialOwners: [],
        directors: [],
        documents,
      };

      await submitBusinessKyc(payload as any);
      toast.success("Business KYC submitted");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Business KYC submit failed", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to submit KYC";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-8 py-6 space-y-4">
      {/* Warning Banner */}
      <div className="flex justify-center items-center bg-yellow-50 border-l-4 border-[#AF4949] p-4 rounded-md">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <p className="text-sm text-gray-700">
          Some required documents are missing. Please upload the highlighted items and try again.
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
                buttonColor={markError(item.id) ? "#DC2626" : "#2563EB"}
                error={markError(item.id)}
                onFileSelected={(file) => setSelected((p) => ({ ...p, [item.id]: file }))}
              />
            ))}
          </div>
          <div className="space-y-4">
            {rightList.map((item) => (
              <UploadCard
                key={item.id}
                id={item.id}
                title={item.title}
                buttonColor={markError(item.id) ? "#DC2626" : "#2563EB"}
                error={markError(item.id)}
                onFileSelected={(file) => setSelected((p) => ({ ...p, [item.id]: file }))}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Keep user in place with same primary action */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium shadow-sm cursor-pointer disabled:opacity-60"
          style={{ backgroundColor: "#2563EB", color: "#fff" }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
};

export default BusinessDocumentWithError;
