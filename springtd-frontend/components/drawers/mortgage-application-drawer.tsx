"use client"

import { useState, useEffect } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"
import { mortgageApi } from "@/lib/accountService"
import { Loader2 } from "lucide-react"

interface MortgageApplicationDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (application: any) => void
  product: {
    id: string
    name: string
    description?: string
    merchantId: string
    minAmount?: number
    maxAmount?: number
    interestRate?: number
    maxLTV?: number // Loan-to-Value ratio
    tenure?: string[]
    currency?: string
  }
  userId: string
}

const PROPERTY_TYPE_OPTIONS = [
  "Residential - Single Family",
  "Residential - Multi Family",
  "Residential - Apartment",
  "Commercial - Office",
  "Commercial - Retail",
  "Land - Residential",
  "Land - Commercial",
]

const TENURE_OPTIONS = ["5 years", "10 years", "15 years", "20 years", "25 years", "30 years"]

const EMPLOYMENT_STATUS_OPTIONS = [
  "Employed - Full Time",
  "Employed - Part Time",
  "Self Employed",
  "Business Owner",
  "Retired",
  "Other",
]

export default function MortgageApplicationDrawer({
  isOpen,
  onClose,
  onSuccess,
  product,
  userId,
}: MortgageApplicationDrawerProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Property Details
  const [propertyValue, setPropertyValue] = useState("")
  const [downPayment, setDownPayment] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")

  // Step 2: Loan Details
  const [tenure, setTenure] = useState("")
  const [employmentStatus, setEmploymentStatus] = useState("")
  const [monthlyIncome, setMonthlyIncome] = useState("")

  // Step 3: Review
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Calculated values
  const [loanAmount, setLoanAmount] = useState<number | null>(null)
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null)
  const [totalRepayment, setTotalRepayment] = useState<number | null>(null)
  const [ltvRatio, setLtvRatio] = useState<number | null>(null)

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setPropertyValue("")
      setDownPayment("")
      setPropertyType("")
      setPropertyAddress("")
      setTenure("")
      setEmploymentStatus("")
      setMonthlyIncome("")
      setAgreedToTerms(false)
      setError(null)
    }
  }, [isOpen])

  // Calculate loan details when values change
  useEffect(() => {
    if (propertyValue && downPayment) {
      const property = parseFloat(removeCommas(propertyValue))
      const down = parseFloat(removeCommas(downPayment))
      const loan = property - down
      const ltv = (loan / property) * 100

      setLoanAmount(loan)
      setLtvRatio(Math.round(ltv * 100) / 100)

      if (tenure && product.interestRate) {
        const years = parseInt(tenure.split(" ")[0])
        const months = years * 12
        const annualRate = product.interestRate / 100
        const monthlyRate = annualRate / 12

        if (monthlyRate > 0) {
          const monthly =
            (loan * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
            (Math.pow(1 + monthlyRate, months) - 1)
          setMonthlyPayment(Math.round(monthly * 100) / 100)
          setTotalRepayment(Math.round(monthly * months * 100) / 100)
        }
      }
    } else {
      setLoanAmount(null)
      setLtvRatio(null)
      setMonthlyPayment(null)
      setTotalRepayment(null)
    }
  }, [propertyValue, downPayment, tenure, product.interestRate])

  // Format number with commas
  const formatWithCommas = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
  }

  // Remove commas for storage
  const removeCommas = (value: string) => {
    return value.replace(/,/g, "")
  }

  // Handle amount input change
  const handleAmountChange = (value: string, setter: (val: string) => void) => {
    const rawValue = removeCommas(value)
    if (rawValue === "" || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      setter(formatWithCommas(rawValue))
    }
  }

  // Validate step 1
  const validateStep1 = () => {
    const property = parseFloat(removeCommas(propertyValue))
    const down = parseFloat(removeCommas(downPayment))

    if (down >= property) {
      return "Down payment must be less than property value"
    }

    const loan = property - down
    if (product.minAmount && loan < product.minAmount) {
      return `Minimum loan amount is ${formatWithCommas(product.minAmount.toString())}`
    }
    if (product.maxAmount && loan > product.maxAmount) {
      return `Maximum loan amount is ${formatWithCommas(product.maxAmount.toString())}`
    }

    const ltv = (loan / property) * 100
    if (product.maxLTV && ltv > product.maxLTV) {
      return `Maximum LTV ratio is ${product.maxLTV}%. Please increase your down payment.`
    }

    return null
  }

  const handleNext = () => {
    setError(null)

    if (step === 1) {
      const validationError = validateStep1()
      if (validationError) {
        setError(validationError)
        return
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleBack = () => {
    setError(null)
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await mortgageApi.apply({
        product_id: product.id,
        merchant_id: product.merchantId,
        user_id: userId,
        propertyValue: parseFloat(removeCommas(propertyValue)),
        loanAmount: loanAmount!,
        downPayment: parseFloat(removeCommas(downPayment)),
        term: parseInt(tenure.split(" ")[0]),
        propertyAddress,
        propertyType: propertyType.split(" - ")[0].toLowerCase() as any,
        applicationData: {
          employmentStatus,
          monthlyIncome: parseFloat(removeCommas(monthlyIncome)),
          ltvRatio,
        },
      })

      if (result.success && result.data) {
        onSuccess(result.data)
      } else {
        setError(result.error || "Failed to submit mortgage application")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your application")
    } finally {
      setIsLoading(false)
    }
  }

  const currencySymbol = product.currency === "USD" ? "$" : product.currency === "GBP" ? "£" : "₦"

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <span className={step === 1 ? "text-[#7C3AED] font-medium" : ""}>Property</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#7C3AED] font-medium" : ""}>Details</span>
      <span>/</span>
      <span className={step === 3 ? "text-[#7C3AED] font-medium" : ""}>Review</span>
    </div>
  )

  const isStep1Valid = propertyValue && downPayment && propertyType && propertyAddress
  const isStep2Valid = tenure && employmentStatus && monthlyIncome
  const isStep3Valid = agreedToTerms

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Apply for Mortgage"
      subtitle={product.name}
    >
      {breadcrumb}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {/* Product Info Card */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-xs text-gray-500 mb-1">Product</p>
            <p className="font-semibold text-gray-900">{product.name}</p>
            {product.description && (
              <p className="text-sm text-gray-600 mt-1">{product.description}</p>
            )}
            <div className="flex gap-4 mt-2">
              {product.interestRate && (
                <p className="text-sm text-[#7C3AED]">
                  Rate: {product.interestRate}% p.a.
                </p>
              )}
              {product.maxLTV && (
                <p className="text-sm text-gray-600">
                  Max LTV: {product.maxLTV}%
                </p>
              )}
            </div>
          </div>

          {/* Property Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Value *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={propertyValue}
                onChange={(e) => handleAmountChange(e.target.value, setPropertyValue)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
          </div>

          {/* Down Payment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Down Payment *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={downPayment}
                onChange={(e) => handleAmountChange(e.target.value, setDownPayment)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
            {ltvRatio !== null && (
              <p className={`text-xs mt-1 ${ltvRatio > (product.maxLTV || 80) ? 'text-red-500' : 'text-gray-500'}`}>
                Loan-to-Value Ratio: {ltvRatio.toFixed(1)}%
              </p>
            )}
          </div>

          {/* Property Type */}
          <InputGroup
            label="Property Type *"
            placeholder="Select property type"
            options={PROPERTY_TYPE_OPTIONS}
            value={propertyType}
            onChange={setPropertyType}
            accentColor="#7C3AED"
          />

          {/* Property Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Address *
            </label>
            <textarea
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="Enter the full property address"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent resize-none"
            />
          </div>

          {/* Loan Summary */}
          {loanAmount !== null && (
            <div className="bg-[#FDF8F0] p-4 rounded-lg mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Loan Amount</span>
                <span className="font-semibold text-[#7C3AED]">
                  {currencySymbol}{formatWithCommas(loanAmount.toFixed(2))}
                </span>
              </div>
            </div>
          )}

          <Button
            onClick={handleNext}
            disabled={!isStep1Valid}
            className="w-full bg-black text-white hover:bg-gray-800 h-12 mt-6"
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {/* Loan Tenure */}
          <InputGroup
            label="Mortgage Term *"
            placeholder="Select mortgage term"
            options={product.tenure || TENURE_OPTIONS}
            value={tenure}
            onChange={setTenure}
            accentColor="#7C3AED"
          />

          {/* Employment Status */}
          <InputGroup
            label="Employment Status *"
            placeholder="Select employment status"
            options={EMPLOYMENT_STATUS_OPTIONS}
            value={employmentStatus}
            onChange={setEmploymentStatus}
            accentColor="#7C3AED"
          />

          {/* Monthly Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Income *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={monthlyIncome}
                onChange={(e) => handleAmountChange(e.target.value, setMonthlyIncome)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
          </div>

          {/* Payment Summary */}
          {monthlyPayment && totalRepayment && (
            <div className="bg-[#FDF8F0] p-4 rounded-lg mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Payment Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Loan Amount</span>
                <span className="font-medium">
                  {currencySymbol}{formatWithCommas(loanAmount!.toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Interest Rate</span>
                <span className="font-medium">{product.interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Payment</span>
                <span className="font-medium">
                  {currencySymbol}{formatWithCommas(monthlyPayment.toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Repayment</span>
                <span className="font-semibold text-[#7C3AED]">
                  {currencySymbol}{formatWithCommas(totalRepayment.toFixed(2))}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <Button onClick={handleBack} variant="outline" className="flex-1 h-12 bg-transparent">
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isStep2Valid}
              className="flex-1 bg-black text-white hover:bg-gray-800 h-12"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/* Review Details */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-900">Review Your Application</p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Product</span>
                <span className="text-sm font-medium text-gray-900">{product.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Property Value</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{propertyValue}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Down Payment</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{downPayment}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Loan Amount</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{loanAmount ? formatWithCommas(loanAmount.toFixed(2)) : "0.00"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Property Type</span>
                <span className="text-sm font-medium text-gray-900">{propertyType}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Mortgage Term</span>
                <span className="text-sm font-medium text-gray-900">{tenure}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Monthly Payment</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{monthlyPayment ? formatWithCommas(monthlyPayment.toFixed(2)) : "0.00"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Repayment</span>
                <span className="text-sm font-semibold text-[#7C3AED]">
                  {currencySymbol}{totalRepayment ? formatWithCommas(totalRepayment.toFixed(2)) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start gap-3 py-4">
            <Checkbox
              id="agree-terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-0.5 rounded-full data-[state=checked]:bg-[#7C3AED] data-[state=checked]:border-[#7C3AED]"
            />
            <label htmlFor="agree-terms" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
              I have read and agree to the{" "}
              <span className="text-[#7C3AED] underline cursor-pointer">Terms and Conditions</span>{" "}
              and{" "}
              <span className="text-[#7C3AED] underline cursor-pointer">Mortgage Agreement</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-12 bg-transparent"
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isStep3Valid || isLoading}
              className="flex-1 bg-black text-white hover:bg-gray-800 h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
