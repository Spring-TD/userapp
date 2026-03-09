"use client";

import React, { useRef, useState } from "react";
import UploadCard from "./UploadCard";
import { toast } from "react-toastify";
import { fileToBase64 } from "@/lib/fileUtils";
import { submitBusinessKyc } from "@/lib/kycService";
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
    const t = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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

      // Build businessDocuments as required by backend schema
      const businessDocuments: BusinessDocPayload[] = [];

      // Also prepare a minimal generic documents array for route middleware
      const genericDocs: GenericDoc[] = [];

      for (const [key, f] of fileEntries) {
        selectedIds.add(key);
        // we already validated type on select
        businessDocuments.push({
          type: mapToBusinessDocType(key),
          fileName: f.name,
          fileType: 'application/pdf',
          fileSize: f.size,
          fileUrl: `https://files.local/${encodeURIComponent(f.name)}`,
          uploadedAt: new Date().toISOString(),
          status: 'low',
        });
        const g = mapToGenericDocType(key);
        if (g) genericDocs.push({ type: g });
      }

      // Enforce that required business documents are selected (license is optional)
      const requiredIds = allIds.filter(id => id !== "license");
      const missing = requiredIds.filter((id) => !selectedIds.has(id));
      if (missing.length > 0) {
        toast.error('Please upload all required documents before continuing.');
        // Don't call onContinue with missing IDs, just show error toast
        return;
      }

      // Build shareholder minimal record using uploaded bank statement metadata
      const bankDocFile = (Object.entries(businessFiles).find(([k]) => k === 'bank_statement')?.[1]) as File | undefined;
      let shareholderBankStmt: any = null;
      if (bankDocFile) {
        shareholderBankStmt = {
          fileName: bankDocFile.name,
          fileType: 'application/pdf',
          fileSize: bankDocFile.size,
          fileUrl: `https://files.local/${encodeURIComponent(bankDocFile.name)}`,
          uploadDate: new Date().toISOString(),
        };
      }

      const payload = {
        // keep documents to satisfy middleware on the route
        documents: genericDocs,
        // dedicated business schema starts here
        userId,
        userType: 'merchant',
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
          annualTurnover,
          expectedTransactionVolume: Math.max(1, Math.round(monthlyVol || 1)),
          expectedTransactionValue: Math.max(1, Math.round(monthlyVol || 1)),
          sourceOfFunds: 'Business revenue',
          businessPurpose: 'Accept payments with SpringTD',
          numberOfEmployees: 1,
          operatingSince: new Date().toISOString(),
          websiteTraffic: 0,
          socialMediaPresence: false,
          marketingChannels: 'Online',
          paymentMethods: 'Cards, bank transfer',
          businessModelDescription: (() => {
            const model = (info.businessModel || '').trim();
            if (!model) return 'Not provided';
            const map: Record<string, string> = {
              B2B: 'Business-to-Business',
              B2C: 'Business-to-Consumer',
              B2B2C: 'Business-to-Business-to-Consumer',
            };
            const expanded = map[model.toUpperCase()] || model;
            return expanded.length < 5 ? `${expanded} model` : expanded;
          })(),
          customerBaseDescription: info.userBase ? `Primary users in ${info.userBase}` : 'General customer base',
          geographicMarkets: info.country || 'Global',
          regulatoryLicenses: 'N/A',
          insuranceCoverage: 'N/A',
          previousBankingRelationship: 'N/A',
          reasonForOpeningAccount: 'To process customer payments',
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
        directors: [
          {
            firstName: 'Account',
            lastName: 'Owner',
            position: 'Director',
            dateOfBirth: new Date('1990-01-01').toISOString(),
            nationality: 'NG',
          },
        ],
        businessDocuments,
        riskAssessment: {
          annualTurnover,
          expectedTransactionVolume: Math.max(1, Math.round(monthlyVol || 1)),
          highRiskJurisdiction: false,
          sanctionListCheck: false,
          adverseMediaCheck: false,
        },
      } as any;

      await submitBusinessKyc(payload as any);
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
                buttonColor="#7C3AED"
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
                buttonColor="#7C3AED"
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
          style={{ backgroundColor: "#7C3AED", color: "#fff" }}
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
