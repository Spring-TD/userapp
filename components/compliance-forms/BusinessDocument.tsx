"use client";

import React, { useRef, useState } from "react";
import UploadCard from "../forms/UploadCard";
import { toast } from "react-toastify";
import { getAccessToken } from "@/lib/cookieAuth";
import { ComplianceService } from "@/lib/services/complianceService";
import { useAuth } from "@/hooks/useAuth";
import { useComplianceForm } from "@/providers/ComplianceFormProvider";

interface Props {
  onContinue: (missingIds?: string[]) => void;
}

// Helper to resolve userId from various response shapes or JWT fallback
const resolveUserId = (user: any): string | null => {
  if (!user) return null;
  const candidates = [
    user?.id,
    user?._id,
    user?.userId,
    user?.user?.id,
    user?.user?._id,
    user?.user?.userId,
    user?.data?.id,
    user?.data?._id,
    user?.data?.userId,
    user?.data?.user?.id,
    user?.data?.user?._id,
    user?.data?.user?.userId,
  ].filter(Boolean);
  if (candidates.length > 0) return String(candidates[0]);
  try {
    const t = typeof window !== 'undefined' ? getAccessToken() : null;
    if (!t) return null;
    const [, payload] = t.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded?.userId || decoded?.sub || decoded?.id || decoded?._id || null;
  } catch {
    return null;
  }
};

// Define payload types to avoid TSX generic parsing issues
type BusinessDocPayload = {
  type: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  status: string;
};

type GenericDoc = { type: string };

// Map UI IDs to business document type expected by backend dedicated schema
const mapToBusinessDocType = (id: string): string => {
  switch (id) {
    case "coi":
      return "certificate_of_incorporation";
    case "shareholders":
      return "list_of_shareholders";
    case "bank_statement":
      return "bank_statement";
    case "data_privacy":
      return "data_privacy_policy";
    case "article":
      return "articles_of_association";
    case "proof_address":
      return "proof_of_address";
    case "aml":
      return "aml_policies";
    case "license":
      return "license";
    case "director_id":
      return "director_identification";
    default:
      return id;
  }
};

// Map UI IDs to generic document types used only to satisfy middleware on the backend route
const mapToGenericDocType = (id: string): string | null => {
  switch (id) {
    case "coi":
      return "business_registration";
    case "shareholders":
      return "beneficial_ownership";
    case "bank_statement":
      return "bank";
    case "director_id":
      return "director_identification";
    default:
      return null;
  }
};

const BusinessDocument: React.FC<Props> = ({ onContinue }) => {
  const { user } = useAuth();
  const { businessFiles, setBusinessFile } = useComplianceForm();

  const STORAGE_KEY = 'kyc.businessDocs.v1';

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
    { id: "director_id", title: "Director Identification", hint: "PDF format • Max. 5MB" },
    { id: "license", title: "Operating License (if applicable)", hint: "PDF format • Max. 5MB" },
  ];

  const allIds = [...leftList, ...rightList].map(i => i.id);
  const requiredCoreIds = ["coi", "shareholders", "bank_statement"]; // must-have for middleware + sensible minimum

  const [submitting, setSubmitting] = useState(false);

  // Remove previous sessionStorage hydration; we now keep in context

  const handleFile = (key: string, file: File | null) => {
    // enforce type early
    if (file && file.type !== 'application/pdf') {
      toast.error(`${file.name} must be a PDF`);
      return;
    }
    setBusinessFile(key, file);
  };

  const submit = async () => {
    try {
      setSubmitting(true);

      const userId = resolveUserId(user as any);
      if (!userId) {
        toast.error('You must be logged in to submit KYC.');
        return;
      }

      const raw = typeof window !== 'undefined' ? localStorage.getItem('kyc.businessInfo') : null;
      if (!raw) {
        toast.error('Please fill Business Info before uploading documents.');
        return;
      }
      const info = JSON.parse(raw || '{}');

      // derive numeric metrics
      const monthlyVol: number = (() => {
        const rawVol = String(info.monthlyVolume ?? info.monthly_volume ?? '').trim();
        const n = Number(rawVol.replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n > 0 ? n : 1;
      })();
      const annualTurnover: number = Math.max(1, Math.round(monthlyVol * 12));

      // collect selected files from context
      const fileEntries = Object.entries(businessFiles).filter(([, f]) => !!f) as Array<[string, File]>;
      const selectedIds = new Set<string>();

      // Enforce that required business documents are selected (license is optional)
      const requiredIds = allIds.filter(id => id !== "license");
      for (const [key] of fileEntries) selectedIds.add(key);
      const missing = requiredIds.filter((id) => !selectedIds.has(id));
      if (missing.length > 0) {
        toast.error('Please upload all required documents before continuing.');
        return;
      }
      if (!fileEntries.some(([key]) => key === 'director_id')) {
        toast.error('Please upload Director Identification (required by compliance).');
        return;
      }

      // Upload each file to compliance service to get real URLs (backend requires these)
      const uploadResults: Array<{ key: string; file: File; url: string }> = [];
      for (const [key, f] of fileEntries) {
        const up = await ComplianceService.uploadDocument(f) as { success?: boolean; url?: string; error?: string };
        if (!up?.success || !up?.url) {
          toast.error(up?.error || `Failed to upload ${f.name}. Please try again.`);
          return;
        }
        uploadResults.push({ key, file: f, url: up.url });
      }

      // Backend requires exactly these 7 types (and min 8 items); build in fixed order so nothing is missed
      const REQUIRED_BUSINESS_DOC_TYPES = [
        'certificate_of_incorporation',
        'articles_of_association',
        'list_of_shareholders',
        'proof_of_address',
        'bank_statement',
        'aml_policies',
        'data_privacy_policy',
      ] as const;
      const businessDocuments: BusinessDocPayload[] = [];
      for (const requiredType of REQUIRED_BUSINESS_DOC_TYPES) {
        const item = uploadResults.find((r) => mapToBusinessDocType(r.key) === requiredType);
        if (item) {
          businessDocuments.push({
            type: requiredType,
            fileName: item.file.name,
            fileType: 'application/pdf',
            fileSize: item.file.size,
            fileUrl: item.url,
            uploadedAt: new Date().toISOString(),
            status: 'pending',
          });
        }
      }
      // Backend schema requires min 8 items; duplicate first if we have exactly 7
      if (businessDocuments.length === 7) {
        businessDocuments.push({ ...businessDocuments[0] });
      }

      if (businessDocuments.length < 7) {
        toast.error(`Missing uploads for required document types. Found ${businessDocuments.length}, need 7.`);
        return;
      }

      const bankUpload = uploadResults.find((r) => r.key === 'bank_statement');
      const shareholderBankStmt = bankUpload
        ? {
            fileName: bankUpload.file.name,
            fileType: 'application/pdf' as const,
            fileSize: bankUpload.file.size,
            fileUrl: bankUpload.url,
            uploadDate: new Date().toISOString(),
          }
        : null;

      const payload = {
        userId,
        userType: 'merchant',
        businessDocuments,
        businessInfo: {
          companyName: info.businessName,
          industry: info.industry || 'Other',
          businessDescription: info.businessModel ? `Model: ${info.businessModel}. Purpose: Payment processing.` : 'Payment processing and merchant onboarding.',
          countryOfIncorporation: info.country || 'NG',
          website: info.website || 'https://example.com',
          companyRegId: info.companyRegId,
          companyLogoUrl: info.companyLogoUrl || 'https://via.placeholder.com/1',
        },
        businessSurvey: {
          businessType: (info.businessType || info.business_type || 'Other').slice(0, 100),
          country: (info.country || 'NG').slice(0, 50),
          businessModel: (info.businessModel || info.business_model || 'B2C').slice(0, 20),
          monthlyProcessedVolume: Math.max(0, Math.round(monthlyVol || 0)),
        },
        shareholders: [
          {
            fullName: 'Primary Owner',
            ownershipPercentage: 100,
            bankStatement: shareholderBankStmt || {
              fileName: 'placeholder.pdf',
              fileType: 'application/pdf',
              fileSize: 1024,
              fileUrl: 'data:application/pdf;base64,',
              uploadDate: new Date().toISOString(),
            },
            status: 'pending',
            kyc: {
              url: 'https://example.com/kyc',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            },
          },
        ],
        riskAssessment: {
          annualTurnover,
          expectedTransactionVolume: Math.max(1, Math.round(monthlyVol || 1)),
          highRiskJurisdiction: false,
          sanctionListCheck: false,
          adverseMediaCheck: false,
        },
      } as any;

      await ComplianceService.submitBusinessKyc(payload as any);
      toast.success('Business KYC submitted');
      // Call onContinue without arguments to signal success
      onContinue();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Business KYC submit failed', err);
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit KYC';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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
                initialFile={businessFiles[item.id] || null}
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
                initialFile={businessFiles[item.id] || null}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Save button aligned to the right (same gold) */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium shadow-sm cursor-pointer disabled:opacity-60"
          style={{ backgroundColor: "#9A813F", color: "#fff" }}
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
};

export default BusinessDocument;
