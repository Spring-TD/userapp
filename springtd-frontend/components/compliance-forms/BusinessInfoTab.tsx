'use client';

import React, { useState, useEffect } from 'react';
import FileUpload from '../FileUpload';
import { toast } from 'react-toastify';

interface BusinessInfoTabProps {
  onContinue?: () => void;
}

interface FloatingSelectProps {
  label: string;
  placeholderText: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  accentColor?: string;
  // optional onSelected callback for special behavior (e.g. collapse)
  onSelected?: () => void;
}

const FloatingSelect: React.FC<FloatingSelectProps> = ({
  label,
  placeholderText,
  value,
  onChange,
  options,
  accentColor = '#9A813F',
  onSelected,
}) => {
  const labelClassBase = 'absolute left-4 transition-all pointer-events-none';
  const labelClassForEmpty = 'top-2.5 text-sm text-gray-400';
  const labelClassForFilled = 'top-1.5 text-xs text-gray-500';

  const labelClass = `${labelClassBase} ${value ? labelClassForFilled : labelClassForEmpty}`;

  return (
    <div className="relative">
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
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
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
    website: '',
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

  // sample option lists (kept from your original)
  const businessTypes = ['E-commerce', 'SaaS', 'Marketplace', 'Financial Services', 'Healthcare', 'Education', 'Other'];
  const countries = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'Other'];
  const businessModels = ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Subscription', 'Freemium', 'Other'];
  const industries = ['Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education', 'Manufacturing', 'Other'];

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Survey */}
        <div className="bg-[#EDEDF2] rounded-xl p-6 border border-gray-200 h-[562px] w-[600px]">
          <h2 className="text-lg font-semibold text-gray-900">Business Survey</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Fill in the required information below to create your business account.
          </p>

          <div className="space-y-8">
            <FloatingSelect
              label="What do you want to create?"
              placeholderText="Select a Business Type"
              options={businessTypes}
              value={formData.businessType}
              onChange={(val) => handleInputChange('businessType', val)}
            />

            <FloatingSelect
              label="Where is your user base?"
              placeholderText="Select a country"
              options={countries}
              value={formData.userBase}
              onChange={(val) => handleInputChange('userBase', val)}
            />

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
                placeholderText="Select a Business Model"
                options={businessModels}
                value={formData.businessModel}
                onChange={(val) => {
                  handleInputChange('businessModel', val);
                  // do not collapse on selection anymore
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
        <div className="bg-[#EDEDF2] rounded-xl p-6 border border-gray-200 w-[700px]">
          <h2 className="text-lg font-semibold text-gray-900">About the Business</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Fill in the required information below to create your business account.
          </p>

          <div className="space-y-8">
            <FloatingSelect
              label="Industry"
              placeholderText="Select Industry Type"
              options={industries}
              value={formData.industry}
              onChange={(val) => handleInputChange('industry', val)}
            />

            <FloatingSelect
              label="Country of incorporation"
              placeholderText="Select a country"
              options={countries}
              value={formData.country}
              onChange={(val) => handleInputChange('country', val)}
            />

            <SimpleInput
              placeholder="Business Name"
              value={formData.businessName}
              onChange={(val) => handleInputChange('businessName', val)}
            />

            <SimpleInput
              placeholder="Website"
              type="url"
              value={formData.website}
              onChange={(val) => handleInputChange('website', val)}
            />

            <SimpleInput
              placeholder="Company Reg. ID Number"
              value={formData.companyRegId}
              onChange={(val) => handleInputChange('companyRegId', val)}
            />

            <FileUpload
              label="Upload Company Logo"
              description="PDF format • Max. 5MB"
              onFileSelect={(file) => console.log('File selected:', file)}
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
            console.log('Business Info saved:', formData);
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
