'use client';

import React, { useState, useEffect } from 'react';
import FileUpload from '../FileUpload';
import { toast } from 'react-toastify';
import { WEBSITE_URL_PREFIX } from '@/lib/websiteUrl';
import { CountrySelect } from '@/components/ui/country-select';
import { ComplianceService } from '@/lib/services/complianceService';

interface BusinessInfoTabProps {
  onContinue?: () => void;
}

interface FloatingSelectProps {
  label: string;
  placeholderText: string;
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  optionPairs?: { value: string; label: string }[];
  accentColor?: string;
  onSelected?: () => void;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  placeholderText,
  value,
  onChange,
  options = [],
  optionPairs,
  accentColor = '#9A813F',
  onSelected,
}) => {
  const labelClassBase = 'absolute left-4 transition-all pointer-events-none';
  const labelClassForEmpty = 'top-2.5 text-sm text-gray-400';
  const labelClassForFilled = 'top-1.5 text-xs text-gray-500';

  const labelClass = `${labelClassBase} ${value ? labelClassForFilled : labelClassForEmpty}`;
  const pairs = optionPairs ?? options.map((opt) => ({ value: opt, label: opt }));

  return (
    <div>
      <label className={labelClass}>{label}</label>

      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (onSelected && e.target.value) onSelected();
        }}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 pt-9 pb-2.5 text-gray-900 appearance-none focus:outline-none focus:ring-1 focus:ring-[#9A813F]"
        style={{ outlineColor: accentColor }}
      >
        <option value="" disabled>
          {placeholderText}
        </option>
        {pairs.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      {/* chevron icon */}
      <svg
        className="absolute right-4 top-[28px] h-8 w-8 text-gray-700 pointer-events-none"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 7l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface SimpleInputProps {
  placeholder: string;
  type?: 'text' | 'url';
  value: string;
  onChange: (v: string) => void;
  accentColor?: string;
}

const SimpleInput: React.FC<SimpleInputProps> = ({
  placeholder,
  type = 'text',
  value,
  onChange,
  accentColor = '#9A813F',
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900"
      style={{ outlineColor: accentColor }}
    />
  );
};

const BusinessInfoTab: React.FC<BusinessInfoTabProps> = ({ onContinue }) => {
  const [formData, setFormData] = useState({
    businessType: '',
    userBase: '',
    businessModel: '',
    monthlyVolume: '',
    industry: '',
    country: '',
    businessName: '',
    website: WEBSITE_URL_PREFIX,
    companyRegId: '',
  });

  // hydrate from localStorage if present (no UI change)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('kyc.businessInfo');
        if (raw) {
          const saved = JSON.parse(raw);
          setFormData((prev) => ({ ...prev, ...saved }));
        }
      }
    } catch (_) {
      // ignore corrupt storage
    }
  }, []);

  // control collapsing animation for the businessModel select
  const [isBusinessModelVisible, setIsBusinessModelVisible] = useState(true);

  // Options from compliance API (business type, industry, business model)
  const [businessTypeOptions, setBusinessTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [industryTypeOptions, setIndustryTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [businessModelOptions, setBusinessModelOptions] = useState<{ value: string; label: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      ComplianceService.getBusinessTypeOptions(),
      ComplianceService.getIndustryTypeOptions(),
      ComplianceService.getBusinessModelOptions(),
    ])
      .then(([types, industries, models]) => {
        if (cancelled) return;
        const fallback = [{ value: 'Other', label: 'Other' }];
        setBusinessTypeOptions(Array.isArray(types) && types.length > 0 ? types : fallback);
        setIndustryTypeOptions(Array.isArray(industries) && industries.length > 0 ? industries : fallback);
        setBusinessModelOptions(Array.isArray(models) && models.length > 0 ? models : fallback);
      })
      .catch(() => {
        if (cancelled) return;
        setBusinessTypeOptions([{ value: 'Other', label: 'Other' }]);
        setIndustryTypeOptions([{ value: 'Other', label: 'Other' }]);
        setBusinessModelOptions([{ value: 'Other', label: 'Other' }]);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // persist to localStorage for cross-tab access
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('kyc.businessInfo', JSON.stringify(next));
        }
      } catch (_) {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 justify-between w-full">
        {/* Business Survey */}
        <div className="bg-[#EDEDF2] rounded-xl p-6 border border-gray-200 w-full ">
          <h2 className="text-lg font-semibold text-gray-900">Business Survey</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Fill in the required information below to create your business account.
          </p>

          <div className="gap-8 flex flex-col">
            <FloatingSelect
              label="What do you want to create?"
              placeholderText={optionsLoading ? "Loading…" : "Select a Business Type"}
              optionPairs={businessTypeOptions}
              value={formData.businessType}
              onChange={(val) => handleInputChange('businessType', val)}
            />

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-500">Where is your user base?</label>
              <CountrySelect
                value={formData.userBase}
                onValueChange={(val) => handleInputChange('userBase', val)}
                placeholder="Select a country"
                triggerClassName="w-full rounded-lg border border-gray-300 bg-white h-12 px-4"
              />
            </div>

            {/* Animated collapse: hides when user selects a business model */}
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: /* keep always visible */ 120,
                opacity: 1,
              }}
              aria-hidden={false}
            >
              <FloatingSelect
                label="What is your business model?"
                placeholderText={optionsLoading ? "Loading…" : "Select a Business Model"}
                optionPairs={businessModelOptions}
                value={formData.businessModel}
                onChange={(val) => {
                  handleInputChange('businessModel', val);
                  setIsBusinessModelVisible(true);
                }}
              />
            </div>

            <SimpleInput
              placeholder="Monthly processed volume"
              value={formData.monthlyVolume}
              onChange={(val) => handleInputChange('monthlyVolume', val)}
            />
          </div>
        </div>

        {/* About the Business */}
        <div className="bg-[#EDEDF2] rounded-xl p-6 border border-gray-200 w-full">
          <h2 className="text-lg font-semibold text-gray-900">About the Business</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Fill in the required information below to create your business account.
          </p>

          <div className="space-y-8">
            <FloatingSelect
              label="Industry"
              placeholderText={optionsLoading ? "Loading…" : "Select Industry Type"}
              optionPairs={industryTypeOptions}
              value={formData.industry}
              onChange={(val) => handleInputChange('industry', val)}
            />

            <div className="space-y-1.5">
              <label className="block text-sm text-gray-500">Country of incorporation</label>
              <CountrySelect
                value={formData.country}
                onValueChange={(val) => handleInputChange('country', val)}
                placeholder="Select a country"
                triggerClassName="w-full rounded-lg border border-gray-300 bg-white h-12 px-4"
              />
            </div>

            <SimpleInput
              placeholder="Business Name"
              value={formData.businessName}
              onChange={(val) => handleInputChange('businessName', val)}
            />

            <SimpleInput
              placeholder="example.com"
              type="url"
              value={formData.website}
              onChange={(val) => {
                const next = val.startsWith('https://') || val.startsWith('http://') ? val : WEBSITE_URL_PREFIX + val;
                handleInputChange('website', next);
              }}
            />

            <SimpleInput
              placeholder="Company Reg. ID Number"
              value={formData.companyRegId}
              onChange={(val) => handleInputChange('companyRegId', val)}
            />

            <FileUpload
              label="Upload Company Logo"
              description="PDF format • Max. 5MB"
              onFileSelect={() => {}}
              buttonColor="#9A813F"
            />
          </div>
        </div>
      </div>

      {/* Save & Continue button aligned to the right */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="px-4 py-2 rounded-md text-sm font-medium shadow-sm cursor-pointer disabled:opacity-60"
          style={{ backgroundColor: "#9A813F", color: "#fff" }}
          onClick={() => {
            toast.success('✅ Business info saved successfully');
            // Navigate to next tab
            if (onContinue) {
              setTimeout(() => onContinue(), 500);
            }
          }}
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};

export default BusinessInfoTab;
