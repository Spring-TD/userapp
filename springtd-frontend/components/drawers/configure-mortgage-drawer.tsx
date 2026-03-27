"use client"

import { useState, useRef } from "react"
import { Upload } from "lucide-react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"

interface ConfigureMortgageDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  mortgageData: any
}

const SECURITY_OPTIONS = [
  { id: "property-collateral", label: "Property Collateral" },
  { id: "guarantor", label: "Guarantor" },
  { id: "insurance", label: "Insurance" },
  { id: "title-deed", label: "Title Deed" },
  { id: "mixed-security", label: "Mixed Security" },
]

const CURRENCY_OPTIONS = ["NGN - Nigerian Naira", "USD - US Dollar", "GBP - British Pound", "EUR - Euro", "GHS - Ghanaian Cedi", "KES - Kenyan Shilling"]
const AMORTIZATION_OPTIONS = ["Equal installments", "Equal principal payment"]
const CHARGES_OPTIONS = ["Disbursement fee by transfer", "Initiation fee", "Insurance fee", "Interest charge", "Processing fee"]

export default function ConfigureMortgageDrawer({ isOpen, onClose, onSubmit, mortgageData }: ConfigureMortgageDrawerProps) {
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState(mortgageData?.description || "")
  const [repaymentCycle, setRepaymentCycle] = useState("")
  const [mortgageTenure, setMortgageTenure] = useState("")
  const [securityRequirements, setSecurityRequirements] = useState<string[]>([])
  const [minFacilityAmount, setMinFacilityAmount] = useState("")
  const [maxFacilityAmount, setMaxFacilityAmount] = useState("")
  const [managementFee, setManagementFee] = useState("")
  const [minRepaymentAmount, setMinRepaymentAmount] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // New fields
  const [currency, setCurrency] = useState("")
  const [amortization, setAmortization] = useState("")
  const [interestMethod, setInterestMethod] = useState("")
  const [penaltyFees, setPenaltyFees] = useState("")
  const [repaymentStructure, setRepaymentStructure] = useState("")
  const [mortgageProcessingFee, setMortgageProcessingFee] = useState("")
  const [moratorium, setMoratorium] = useState("")
  const [downPaymentRequired, setDownPaymentRequired] = useState(false)
  const [npa, setNpa] = useState("")
  const [charges, setCharges] = useState("")

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
      const minAmount = parseFloat(removeCommas(minFacilityAmount))
      const maxAmount = parseFloat(removeCommas(maxFacilityAmount))
      
      if (maxAmount < minAmount) {
        setErrors(prev => ({ ...prev, maxAmount: 'Maximum must be greater than minimum' }))
        return
      }
      
      if (errors.managementFee || errors.interestRate) {
        return
      }
      
      onSubmit({
        ...mortgageData,
        purpose,
        repaymentCycle,
        mortgageTenure,
        securityRequirements,
        minFacilityAmount: removeCommas(minFacilityAmount),
        maxFacilityAmount: removeCommas(maxFacilityAmount),
        managementFee,
        minRepaymentAmount: removeCommas(minRepaymentAmount),
        interestRate,
        currency,
        amortization,
        interestMethod,
        penaltyFees: removeCommas(penaltyFees),
        repaymentStructure,
        mortgageProcessingFee: removeCommas(mortgageProcessingFee),
        moratorium,
        downPaymentRequired,
        npa,
        charges,
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
      <span className={step === 1 ? "text-[#9A813F] font-medium" : ""}>Purpose</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#9A813F] font-medium" : ""}>Amount</span>
      <span>/</span>
      <span>Timeline</span>
    </div>
  )

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Configure mortgage product"
      subtitle={step === 1 ? "Create the product you want" : "Product amount details"}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent resize-none"
            />
          </div>

          <InputGroup
            label="Currency"
            placeholder="Select Currency"
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
            accentColor="#9A813F"
          />

          <InputGroup
            label="Repayment Cycle"
            placeholder="Repayment Cycle"
            options={["Daily", "Weekly", "Monthly", "Quarterly", "Annually"]}
            value={repaymentCycle}
            onChange={setRepaymentCycle}
            accentColor="#9A813F"
          />

          <InputGroup
            label="Mortgage Tenure"
            placeholder="Mortgage Tenure"
            options={["5 years", "10 years", "15 years", "20 years", "25 years", "30 years"]}
            value={mortgageTenure}
            onChange={setMortgageTenure}
            accentColor="#9A813F"
          />

          <InputGroup
            label="Amortization"
            placeholder="Select Amortization Method"
            options={AMORTIZATION_OPTIONS}
            value={amortization}
            onChange={setAmortization}
            accentColor="#9A813F"
          />

          <TextInput
            label="Interest Method"
            placeholder="Enter interest method"
            value={interestMethod}
            onChange={setInterestMethod}
          />

          <TextInput
            label="Repayment Structure"
            placeholder="Enter repayment structure"
            value={repaymentStructure}
            onChange={setRepaymentStructure}
          />

          <TextInput
            label="Moratorium"
            placeholder="Enter moratorium period (e.g., 3 months)"
            value={moratorium}
            onChange={setMoratorium}
          />

          <InputGroup
            label="Charges"
            placeholder="Select Charge Type"
            options={CHARGES_OPTIONS}
            value={charges}
            onChange={setCharges}
            accentColor="#9A813F"
          />

          <div className="flex items-center gap-3 py-2">
            <Checkbox
              id="down-payment-required"
              checked={downPaymentRequired}
              onCheckedChange={(checked) => setDownPaymentRequired(checked as boolean)}
              className="rounded-full data-[state=checked]:bg-[#9A813F] data-[state=checked]:border-[#9A813F]"
            />
            <label htmlFor="down-payment-required" className="text-sm font-medium text-gray-700 cursor-pointer">
              Down Payment Required
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Security Requirements (select all that apply)</label>
            <div className="grid grid-cols-2 gap-3">
              {SECURITY_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`security-${option.id}`}
                    checked={securityRequirements.includes(option.id)}
                    onCheckedChange={(checked) => handleSecurityChange(option.id, checked as boolean)}
                    className="rounded-full data-[state=checked]:bg-[#9A813F] data-[state=checked]:border-[#9A813F]"
                  />
                  <label htmlFor={`security-${option.id}`} className="text-sm text-gray-700 cursor-pointer">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Additional requirement</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto mb-2 text-gray-400" size={24} />
              {uploadedFile ? (
                <p className="text-sm text-green-600 mb-1">{uploadedFile.name}</p>
              ) : (
                <p className="text-sm text-gray-600 mb-1">Additional requirement</p>
              )}
              <p className="text-xs text-gray-400">PDF format • Max. 5MB</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 bg-[#9A813F] text-white hover:bg-[#8A7335]"
              >
                {uploadedFile ? 'Change File' : 'Upload'}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleNext}
            disabled={!purpose || !currency || !repaymentCycle || !mortgageTenure || !amortization || securityRequirements.length === 0}
            className="w-full bg-black text-white hover:bg-gray-800 h-12 mt-6"
          >
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Facility Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={minFacilityAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMinFacilityAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Facility Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={maxFacilityAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMaxFacilityAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
            {removeCommas(minFacilityAmount) && removeCommas(maxFacilityAmount) && 
             parseFloat(removeCommas(maxFacilityAmount)) < parseFloat(removeCommas(minFacilityAmount)) && (
              <p className="text-red-500 text-xs mt-1">Maximum must be greater than minimum</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Management Fee (%)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={managementFee}
                onChange={(e) => handlePercentageChange(e.target.value, setManagementFee, 'managementFee')}
                className={`w-full pl-4 pr-8 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.managementFee ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.managementFee && <p className="text-red-500 text-xs mt-1">{errors.managementFee}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Repayment Amount (₦)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="text"
                placeholder="0.00"
                value={minRepaymentAmount}
                onChange={(e) => handleCurrencyChange(e.target.value, setMinRepaymentAmount)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (% per annum)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={interestRate}
                onChange={(e) => handlePercentageChange(e.target.value, setInterestRate, 'interestRate')}
                className={`w-full pl-4 pr-16 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.interestRate ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">% p.a.</span>
            </div>
            {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Penalty Fees (%)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={penaltyFees}
                onChange={(e) => handlePercentageChange(e.target.value, setPenaltyFees, 'penaltyFees')}
                className={`w-full pl-4 pr-8 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.penaltyFees ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.penaltyFees && <p className="text-red-500 text-xs mt-1">{errors.penaltyFees}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mortgage Processing Fee (%)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="0.00"
                value={mortgageProcessingFee}
                onChange={(e) => handlePercentageChange(e.target.value, setMortgageProcessingFee, 'mortgageProcessingFee')}
                className={`w-full pl-4 pr-8 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent ${errors.mortgageProcessingFee ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
            {errors.mortgageProcessingFee && <p className="text-red-500 text-xs mt-1">{errors.mortgageProcessingFee}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NPA (Non-Performing Assets) Days</label>
            <input
              type="text"
              placeholder="Enter NPA days threshold"
              value={npa}
              onChange={(e) => setNpa(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 mt-6">
            <Button onClick={handleBack} variant="outline" className="flex-1 h-12 bg-transparent">
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!minFacilityAmount || !maxFacilityAmount || !managementFee || !minRepaymentAmount || !interestRate}
              className="flex-1 bg-black text-white hover:bg-gray-800 h-12"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
