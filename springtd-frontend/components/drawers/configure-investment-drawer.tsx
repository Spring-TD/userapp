"use client"

import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface ConfigureInvestmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  investmentData: any
  accentColor?: string
}

const SECURITY_OPTIONS = [
  { id: "kyc-verification", label: "KYC Verification" },
  { id: "bvn", label: "BVN" },
  { id: "nin", label: "NIN" },
  { id: "accredited-investor", label: "Accredited Investor Status" },
  { id: "none", label: "None" },
]

const CURRENCY_OPTIONS = ["NGN - Nigerian Naira", "USD - US Dollar", "GBP - British Pound", "EUR - Euro", "GHS - Ghanaian Cedi", "KES - Kenyan Shilling"]
const PAYOUT_OPTIONS = ["Monthly", "Quarterly", "Semi-Annually", "Annually", "At Maturity"]
const RISK_LEVELS = ["Low Risk", "Medium Risk", "High Risk"]

export default function ConfigureInvestmentDrawer({ isOpen, onClose, onSubmit, investmentData, accentColor = "#9A813F" }: ConfigureInvestmentDrawerProps) {
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState(investmentData?.description || "")
  const [payoutCycle, setPayoutCycle] = useState("")
  const [investmentTenure, setInvestmentTenure] = useState("")
  const [securityRequirements, setSecurityRequirements] = useState<string[]>([])
  const [minInvestmentAmount, setMinInvestmentAmount] = useState("")
  const [maxInvestmentAmount, setMaxInvestmentAmount] = useState("")
  const [managementFee, setManagementFee] = useState("")
  const [expectedReturn, setExpectedReturn] = useState("")
  const [riskLevel, setRiskLevel] = useState("")
  const [currency, setCurrency] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Format number with commas
  const formatWithCommas = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '')
    const parts = numericValue.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  }

  // Remove commas for storage
  const removeCommas = (value: string) => {
    return value.replace(/,/g, '')
  }

  // Handle currency input change
  const handleCurrencyChange = (value: string, setter: (val: string) => void) => {
    const rawValue = removeCommas(value)
    if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      setter(formatWithCommas(rawValue))
    }
  }

  // Handle percentage input change with max 100 validation
  const handlePercentageChange = (value: string, setter: (val: string) => void, fieldName: string) => {
    const rawValue = value.replace(/[^0-9.]/g, '')
    if (rawValue === '' || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      const numValue = parseFloat(rawValue)
      if (rawValue === '' || numValue <= 100) {
        setter(rawValue)
        setErrors(prev => ({ ...prev, [fieldName]: '' }))
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: 'Percentage cannot exceed 100%' }))
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setUploadedFile(file)
    }
  }

  const handleSecurityChange = (optionId: string, checked: boolean) => {
    if (checked) {
      setSecurityRequirements(prev => [...prev, optionId])
    } else {
      setSecurityRequirements(prev => prev.filter(id => id !== optionId))
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      // Validate before submit
      const minAmount = parseFloat(removeCommas(minInvestmentAmount))
      const maxAmount = parseFloat(removeCommas(maxInvestmentAmount))
      
      if (maxAmount < minAmount) {
        setErrors(prev => ({ ...prev, maxAmount: 'Maximum must be greater than minimum' }))
        return
      }
      
      if (errors.managementFee || errors.expectedReturn) {
        return
      }
      
      onSubmit({
        ...investmentData,
        purpose,
        payoutCycle,
        investmentTenure,
        securityRequirements,
        minInvestmentAmount: removeCommas(minInvestmentAmount),
        maxInvestmentAmount: removeCommas(maxInvestmentAmount),
        managementFee,
        expectedReturn,
        riskLevel,
        currency,
      })
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <span style={{ color: step === 1 ? accentColor : undefined, fontWeight: step === 1 ? 500 : undefined }}>Details</span>
      <span>/</span>
      <span style={{ color: step === 2 ? accentColor : undefined, fontWeight: step === 2 ? 500 : undefined }}>Configuration</span>
    </div>
  )

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure investment product"
      subtitle={step === 1 ? "Create the product you want" : "Product configuration details"}
    >
      <div className="mb-4">{breadcrumb}</div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose/Description</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose/Description"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{ "--tw-ring-color": accentColor } as any}
            />
          </div>

          <InputGroup
            label="Currency"
            placeholder="Select Currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
            accentColor={accentColor}
          />

          <InputGroup
            label="Payout Cycle"
            placeholder="Select payout cycle"
            options={PAYOUT_OPTIONS}
            value={payoutCycle}
            onChange={setPayoutCycle}
            accentColor={accentColor}
          />

          <TextInput
            label="Investment Tenure (months)"
            placeholder="e.g., 12"
            value={investmentTenure}
            onChange={setInvestmentTenure}
            accentColor={accentColor}
          />

          <InputGroup
            label="Risk Level"
            placeholder="Select risk level"
            options={RISK_LEVELS}
            value={riskLevel}
            onChange={setRiskLevel}
            accentColor={accentColor}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Security Requirements</label>
            {SECURITY_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={securityRequirements.includes(option.id)}
                  onCheckedChange={(checked) => handleSecurityChange(option.id, checked as boolean)}
                />
                <label htmlFor={option.id} className="text-sm text-gray-600 cursor-pointer">
                  {option.label}
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleNext}
              className="flex-1 h-12 text-white"
              style={{ backgroundColor: accentColor }}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <TextInput
            label="Minimum Investment Amount"
            placeholder="0.00"
            value={minInvestmentAmount}
            onChange={(val) => handleCurrencyChange(val, setMinInvestmentAmount)}
            accentColor={accentColor}
          />

          <div>
            <TextInput
              label="Maximum Investment Amount"
              placeholder="0.00"
              value={maxInvestmentAmount}
              onChange={(val) => handleCurrencyChange(val, setMaxInvestmentAmount)}
              accentColor={accentColor}
            />
            {errors.maxAmount && <p className="text-red-500 text-xs mt-1">{errors.maxAmount}</p>}
          </div>

          <div>
            <TextInput
              label="Management Fee (%)"
              placeholder="e.g., 2.5"
              value={managementFee}
              onChange={(val) => handlePercentageChange(val, setManagementFee, 'managementFee')}
              accentColor={accentColor}
            />
            {errors.managementFee && <p className="text-red-500 text-xs mt-1">{errors.managementFee}</p>}
          </div>

          <div>
            <TextInput
              label="Expected Annual Return (%)"
              placeholder="e.g., 15"
              value={expectedReturn}
              onChange={(val) => handlePercentageChange(val, setExpectedReturn, 'expectedReturn')}
              accentColor={accentColor}
            />
            {errors.expectedReturn && <p className="text-red-500 text-xs mt-1">{errors.expectedReturn}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Investment Prospectus (PDF)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center gap-2 hover:border-gray-400 transition-colors"
            >
              <Upload className="w-6 h-6 text-gray-400" />
              <span className="text-sm text-gray-600">
                {uploadedFile ? uploadedFile.name : "Click to upload PDF (max 5MB)"}
              </span>
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 h-12 text-white"
              style={{ backgroundColor: accentColor }}
            >
              Create Investment
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
