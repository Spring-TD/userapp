"use client"

import { useState, useEffect } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"
import { savingsApi } from "@/lib/services/accountService"
import { Loader2 } from "lucide-react"

interface SavingsApplicationDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (account: any) => void
  product: {
    id: string
    name: string
    description?: string
    merchantId: string
    minDeposit?: number
    interestRate?: number
    currency?: string
    maturityPeriod?: string[]
  }
  userId: string
}

const SAVINGS_GOAL_OPTIONS = [
  "Emergency fund",
  "Retirement",
  "Education",
  "Home purchase",
  "Vehicle purchase",
  "Travel",
  "Wedding",
  "General savings",
  "Other",
]

const MATURITY_OPTIONS = ["3 months", "6 months", "12 months", "24 months", "36 months", "No fixed term"]

export default function SavingsApplicationDrawer({
  isOpen,
  onClose,
  onSuccess,
  product,
  userId,
}: SavingsApplicationDrawerProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [initialDeposit, setInitialDeposit] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [maturityPeriod, setMaturityPeriod] = useState("")
  const [savingsGoal, setSavingsGoal] = useState("")
  const [otherGoal, setOtherGoal] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Calculated values
  const [projectedInterest, setProjectedInterest] = useState<number | null>(null)
  const [projectedBalance, setProjectedBalance] = useState<number | null>(null)

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setInitialDeposit("")
      setTargetAmount("")
      setMaturityPeriod("")
      setSavingsGoal("")
      setOtherGoal("")
      setAgreedToTerms(false)
      setError(null)
      setProjectedInterest(null)
      setProjectedBalance(null)
    }
  }, [isOpen])

  // Calculate projected interest when deposit or maturity changes
  useEffect(() => {
    if (initialDeposit && maturityPeriod && product.interestRate) {
      const principal = parseFloat(removeCommas(initialDeposit))
      const months = maturityPeriod === "No fixed term" ? 12 : parseInt(maturityPeriod.split(" ")[0])
      const annualRate = product.interestRate / 100

      // Simple interest calculation for projection
      const interest = principal * annualRate * (months / 12)
      setProjectedInterest(Math.round(interest * 100) / 100)
      setProjectedBalance(Math.round((principal + interest) * 100) / 100)
    } else {
      setProjectedInterest(null)
      setProjectedBalance(null)
    }
  }, [initialDeposit, maturityPeriod, product.interestRate])

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

  // Validate deposit
  const validateDeposit = () => {
    const numDeposit = parseFloat(removeCommas(initialDeposit))
    if (product.minDeposit && numDeposit < product.minDeposit) {
      return `Minimum deposit is ${formatWithCommas(product.minDeposit.toString())}`
    }
    return null
  }

  const handleNext = () => {
    setError(null)
    const depositError = validateDeposit()
    if (depositError) {
      setError(depositError)
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
      const maturityDate = maturityPeriod !== "No fixed term"
        ? new Date(Date.now() + parseInt(maturityPeriod.split(" ")[0]) * 30 * 24 * 60 * 60 * 1000).toISOString()
        : undefined

      const result = await savingsApi.create({
        product_id: product.id,
        user_id: userId,
        initial_deposit: parseFloat(removeCommas(initialDeposit)),
        currency: product.currency || "NGN",
        targetAmount: targetAmount ? parseFloat(removeCommas(targetAmount)) : undefined,
        maturityDate,
      })

      if (result.success && result.data) {
        onSuccess(result.data)
      } else {
        setError(result.error || "Failed to create savings account")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while creating your savings account")
    } finally {
      setIsLoading(false)
    }
  }

  const currencySymbol = product.currency === "USD" ? "$" : product.currency === "GBP" ? "£" : "₦"

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <span className={step === 1 ? "text-[#7C3AED] font-medium" : ""}>Details</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#7C3AED] font-medium" : ""}>Review</span>
    </div>
  )

  const isStep1Valid = initialDeposit && maturityPeriod && savingsGoal && (savingsGoal !== "Other" || otherGoal)
  const isStep2Valid = agreedToTerms

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Open Savings Account"
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

          {/* Initial Deposit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Deposit *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={initialDeposit}
                onChange={(e) => handleAmountChange(e.target.value, setInitialDeposit)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
            {product.minDeposit && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum deposit: {currencySymbol}{formatWithCommas(product.minDeposit.toString())}
              </p>
            )}
          </div>

          {/* Target Amount (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Amount (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                {currencySymbol}
              </span>
              <input
                type="text"
                placeholder="0.00"
                value={targetAmount}
                onChange={(e) => handleAmountChange(e.target.value, setTargetAmount)}
                className="w-full pl-8 pr-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set a savings goal to track your progress
            </p>
          </div>

          {/* Maturity Period */}
          <InputGroup
            label="Savings Period *"
            placeholder="Select savings period"
            options={product.maturityPeriod || MATURITY_OPTIONS}
            value={maturityPeriod}
            onChange={setMaturityPeriod}
            accentColor="#7C3AED"
          />

          {/* Savings Goal */}
          <InputGroup
            label="Savings Goal *"
            placeholder="Select your savings goal"
            options={SAVINGS_GOAL_OPTIONS}
            value={savingsGoal}
            onChange={setSavingsGoal}
            accentColor="#7C3AED"
          />

          {/* Other Goal (if selected) */}
          {savingsGoal === "Other" && (
            <TextInput
              label="Please specify"
              placeholder="Enter your savings goal"
              value={otherGoal}
              onChange={setOtherGoal}
            />
          )}

          {/* Projected Earnings */}
          {projectedInterest && projectedBalance && (
            <div className="bg-[#FDF8F0] p-4 rounded-lg mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Projected Earnings</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Interest Rate</span>
                <span className="font-medium">{product.interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Projected Interest</span>
                <span className="font-medium text-green-600">
                  +{currencySymbol}{formatWithCommas(projectedInterest.toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance at Maturity</span>
                <span className="font-semibold text-[#7C3AED]">
                  {currencySymbol}{formatWithCommas(projectedBalance.toFixed(2))}
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
            <p className="text-sm font-semibold text-gray-900">Review Your Account Details</p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Product</span>
                <span className="text-sm font-medium text-gray-900">{product.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Initial Deposit</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{initialDeposit}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              {targetAmount && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Target Amount</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currencySymbol}{targetAmount}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200" />
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Savings Period</span>
                <span className="text-sm font-medium text-gray-900">{maturityPeriod}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Savings Goal</span>
                <span className="text-sm font-medium text-gray-900">
                  {savingsGoal === "Other" ? otherGoal : savingsGoal}
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
                <span className="text-xs text-gray-500">Projected Balance</span>
                <span className="text-sm font-semibold text-[#7C3AED]">
                  {currencySymbol}{projectedBalance ? formatWithCommas(projectedBalance.toFixed(2)) : "0.00"}
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
              <span className="text-[#7C3AED] underline cursor-pointer">Savings Account Agreement</span>
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
                  Creating...
                </>
              ) : (
                "Open Account"
              )}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
