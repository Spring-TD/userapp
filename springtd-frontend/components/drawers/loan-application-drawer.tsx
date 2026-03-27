"use client"

import { useState, useEffect } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"
import { loanApi, pricingApi } from "@/lib/accountService"
import { Loader2 } from "lucide-react"

interface LoanApplicationDrawerProps {
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
    tenure?: string[]
    currency?: string
  }
  userId: string
}

const LOAN_PURPOSE_OPTIONS = [
  "Personal expenses",
  "Business expansion",
  "Education",
  "Medical expenses",
  "Home improvement",
  "Debt consolidation",
  "Travel",
  "Wedding expenses",
  "Emergency",
  "Other",
]

const TENURE_OPTIONS = ["3 months", "6 months", "12 months", "18 months", "24 months", "36 months"]

export default function LoanApplicationDrawer({
  isOpen,
  onClose,
  onSuccess,
  product,
  userId,
}: LoanApplicationDrawerProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [amount, setAmount] = useState("")
  const [tenure, setTenure] = useState("")
  const [purpose, setPurpose] = useState("")
  const [otherPurpose, setOtherPurpose] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Calculated values
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null)
  const [totalRepayment, setTotalRepayment] = useState<number | null>(null)

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setAmount("")
      setTenure("")
      setPurpose("")
      setOtherPurpose("")
      setAgreedToTerms(false)
      setError(null)
      setMonthlyPayment(null)
      setTotalRepayment(null)
    }
  }, [isOpen])

  // Calculate loan repayment when amount or tenure changes
  useEffect(() => {
    if (amount && tenure && product.interestRate) {
      const principal = parseFloat(removeCommas(amount))
      const months = parseInt(tenure.split(" ")[0])
      const annualRate = product.interestRate / 100
      const monthlyRate = annualRate / 12

      if (monthlyRate > 0) {
        // PMT formula: P * (r(1+r)^n) / ((1+r)^n - 1)
        const monthly =
          (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
          (Math.pow(1 + monthlyRate, months) - 1)
        setMonthlyPayment(Math.round(monthly * 100) / 100)
        setTotalRepayment(Math.round(monthly * months * 100) / 100)
      } else {
        // No interest
        setMonthlyPayment(Math.round((principal / months) * 100) / 100)
        setTotalRepayment(principal)
      }
    } else {
      setMonthlyPayment(null)
      setTotalRepayment(null)
    }
  }, [amount, tenure, product.interestRate])

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
  const handleAmountChange = (value: string) => {
    const rawValue = removeCommas(value)
    if (rawValue === "" || /^\d*\.?\d{0,2}$/.test(rawValue)) {
      setAmount(formatWithCommas(rawValue))
    }
  }

  // Validate amount
  const validateAmount = () => {
    const numAmount = parseFloat(removeCommas(amount))
    if (product.minAmount && numAmount < product.minAmount) {
      return `Minimum amount is ${formatWithCommas(product.minAmount.toString())}`
    }
    if (product.maxAmount && numAmount > product.maxAmount) {
      return `Maximum amount is ${formatWithCommas(product.maxAmount.toString())}`
    }
    return null
  }

  const handleNext = () => {
    setError(null)
    const amountError = validateAmount()
    if (amountError) {
      setError(amountError)
      return
    }
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
    setError(null)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await loanApi.apply({
        product_id: product.id,
        merchant_id: product.merchantId,
        user_id: userId,
        amount: parseFloat(removeCommas(amount)),
        term: parseInt(tenure.split(" ")[0]),
        purpose: purpose === "Other" ? otherPurpose : purpose,
      })

      if (result.success && result.data) {
        onSuccess(result.data)
      } else {
        setError(result.error || "Failed to submit loan application")
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
      <span className={step === 1 ? "text-[#7C3AED] font-medium" : ""}>Amount</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#7C3AED] font-medium" : ""}>Review</span>
    </div>
  )

  const isStep1Valid = amount && tenure && purpose && (purpose !== "Other" || otherPurpose)
  const isStep2Valid = agreedToTerms

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Apply for Loan"
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
            {product.interestRate && (
              <p className="text-sm text-[#7C3AED] mt-2">
                Interest Rate: {product.interestRate}% per annum
              </p>
            )}
          </div>

          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan Amount *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
            {product.minAmount && product.maxAmount && (
              <p className="text-xs text-gray-500 mt-1">
                Min: {currencySymbol}{formatWithCommas(product.minAmount.toString())} | Max: {currencySymbol}{formatWithCommas(product.maxAmount.toString())}
              </p>
            )}
          </div>

          {/* Loan Tenure */}
          <InputGroup
            label="Loan Tenure *"
            placeholder="Select loan tenure"
            options={product.tenure || TENURE_OPTIONS}
            value={tenure}
            onChange={setTenure}
            accentColor="#7C3AED"
          />

          {/* Loan Purpose */}
          <InputGroup
            label="Purpose of Loan *"
            placeholder="Select purpose"
            options={LOAN_PURPOSE_OPTIONS}
            value={purpose}
            onChange={setPurpose}
            accentColor="#7C3AED"
          />

          {/* Other Purpose (if selected) */}
          {purpose === "Other" && (
            <TextInput
              label="Please specify"
              placeholder="Enter purpose of loan"
              value={otherPurpose}
              onChange={setOtherPurpose}
            />
          )}

          {/* Loan Summary */}
          {monthlyPayment && totalRepayment && (
            <div className="bg-[#FDF8F0] p-4 rounded-lg mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Loan Summary</p>
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
                <span className="text-xs text-gray-500">Loan Amount</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{amount}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Tenure</span>
                <span className="text-sm font-medium text-gray-900">{tenure}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Purpose</span>
                <span className="text-sm font-medium text-gray-900">
                  {purpose === "Other" ? otherPurpose : purpose}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Interest Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {product.interestRate}% p.a.
                </span>
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
              <span className="text-[#7C3AED] underline cursor-pointer">Loan Agreement</span>
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
              disabled={!isStep2Valid || isLoading}
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
