"use client"

import { useState, useEffect } from "react"
import { Drawer } from "@/components/drawer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import TextInput from "@/components/text-input"
import InputGroup from "@/components/input-group"
import { commodityApi } from "@/lib/services/accountService"
import { Loader2, TrendingUp, TrendingDown } from "lucide-react"

interface CommodityPurchaseDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (purchase: any) => void
  product: {
    id: string
    name: string
    description?: string
    merchantId: string
    commodityType?: string
    unitPrice?: number
    minQuantity?: number
    maxQuantity?: number
    availableQuantity?: number
    priceChange24h?: number // percentage change in last 24h
    currency?: string
  }
  userId: string
}

const PAYMENT_METHOD_OPTIONS = [
  "Wallet Balance",
  "Bank Transfer",
  "Card Payment",
]

export default function CommodityPurchaseDrawer({
  isOpen,
  onClose,
  onSuccess,
  product,
  userId,
}: CommodityPurchaseDrawerProps) {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [quantity, setQuantity] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Calculated values
  const [totalAmount, setTotalAmount] = useState<number | null>(null)

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setQuantity("")
      setPaymentMethod("")
      setAgreedToTerms(false)
      setError(null)
      setTotalAmount(null)
    }
  }, [isOpen])

  // Calculate total when quantity changes
  useEffect(() => {
    if (quantity && product.unitPrice) {
      const qty = parseFloat(quantity)
      const total = qty * product.unitPrice
      setTotalAmount(Math.round(total * 100) / 100)
    } else {
      setTotalAmount(null)
    }
  }, [quantity, product.unitPrice])

  // Format number with commas
  const formatWithCommas = (value: string | number) => {
    const numericValue = value.toString().replace(/[^0-9.]/g, "")
    const parts = numericValue.split(".")
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    return parts.join(".")
  }

  // Handle quantity input change
  const handleQuantityChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    if (numericValue === "" || /^\d*\.?\d{0,4}$/.test(numericValue)) {
      setQuantity(numericValue)
    }
  }

  // Validate quantity
  const validateQuantity = () => {
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      return "Please enter a valid quantity"
    }
    if (product.minQuantity && qty < product.minQuantity) {
      return `Minimum quantity is ${product.minQuantity}`
    }
    if (product.maxQuantity && qty > product.maxQuantity) {
      return `Maximum quantity is ${product.maxQuantity}`
    }
    if (product.availableQuantity && qty > product.availableQuantity) {
      return `Only ${product.availableQuantity} units available`
    }
    return null
  }

  const handleNext = () => {
    setError(null)
    const quantityError = validateQuantity()
    if (quantityError) {
      setError(quantityError)
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
      const result = await commodityApi.buy({
        product_id: product.id,
        user_id: "", // Will be set from auth context in real usage
        amount: totalAmount!,
        quantity: parseFloat(quantity),
      })

      if (result.success && result.data) {
        onSuccess(result.data)
      } else {
        setError(result.error || "Failed to complete purchase")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while processing your purchase")
    } finally {
      setIsLoading(false)
    }
  }

  const currencySymbol = product.currency === "USD" ? "$" : product.currency === "GBP" ? "£" : "₦"
  const priceChangePositive = (product.priceChange24h || 0) >= 0

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
      <span className={step === 1 ? "text-[#7C3AED] font-medium" : ""}>Amount</span>
      <span>/</span>
      <span className={step === 2 ? "text-[#7C3AED] font-medium" : ""}>Confirm</span>
    </div>
  )

  const isStep1Valid = quantity && parseFloat(quantity) > 0 && paymentMethod
  const isStep2Valid = agreedToTerms

  return (
    <Drawer
      open={isOpen}
      onOpenChange={onClose}
      title="Buy Commodity"
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
          {/* Commodity Info Card */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 mb-1">Commodity</p>
                <p className="font-semibold text-gray-900">{product.name}</p>
                {product.commodityType && (
                  <p className="text-sm text-gray-600 mt-1">{product.commodityType}</p>
                )}
              </div>
              {product.priceChange24h !== undefined && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${priceChangePositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {priceChangePositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span className="text-xs font-medium">
                    {priceChangePositive ? '+' : ''}{product.priceChange24h.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            {product.description && (
              <p className="text-sm text-gray-600 mt-2">{product.description}</p>
            )}
          </div>

          {/* Current Price */}
          <div className="bg-[#FDF8F0] p-4 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Current Price</p>
            <p className="text-2xl font-bold text-[#7C3AED]">
              {currencySymbol}{product.unitPrice ? formatWithCommas(product.unitPrice.toFixed(2)) : "0.00"}
              <span className="text-sm font-normal text-gray-500 ml-1">per unit</span>
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="text"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
            />
            <div className="flex justify-between mt-1">
              {product.minQuantity && (
                <p className="text-xs text-gray-500">
                  Min: {product.minQuantity}
                </p>
              )}
              {product.availableQuantity && (
                <p className="text-xs text-gray-500">
                  Available: {formatWithCommas(product.availableQuantity)}
                </p>
              )}
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            {[10, 50, 100, 500].map((amt) => (
              <button
                key={amt}
                onClick={() => setQuantity(amt.toString())}
                className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-[#7C3AED] transition-colors"
              >
                {amt}
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <InputGroup
            label="Payment Method *"
            placeholder="Select payment method"
            options={PAYMENT_METHOD_OPTIONS}
            value={paymentMethod}
            onChange={setPaymentMethod}
            accentColor="#7C3AED"
          />

          {/* Order Summary */}
          {totalAmount !== null && (
            <div className="bg-gray-50 p-4 rounded-lg mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Order Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{formatWithCommas(quantity)} units</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unit Price</span>
                <span className="font-medium">
                  {currencySymbol}{product.unitPrice ? formatWithCommas(product.unitPrice.toFixed(2)) : "0.00"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-semibold text-[#7C3AED]">
                  {currencySymbol}{formatWithCommas(totalAmount.toFixed(2))}
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
            <p className="text-sm font-semibold text-gray-900">Confirm Your Purchase</p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Commodity</span>
                <span className="text-sm font-medium text-gray-900">{product.name}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Quantity</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatWithCommas(quantity)} units
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Unit Price</span>
                <span className="text-sm font-medium text-gray-900">
                  {currencySymbol}{product.unitPrice ? formatWithCommas(product.unitPrice.toFixed(2)) : "0.00"}
                </span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Payment Method</span>
                <span className="text-sm font-medium text-gray-900">{paymentMethod}</span>
              </div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Total Amount</span>
                <span className="text-sm font-semibold text-[#7C3AED]">
                  {currencySymbol}{totalAmount ? formatWithCommas(totalAmount.toFixed(2)) : "0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Warning */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Risk Warning:</strong> Commodity prices can be volatile. 
              Past performance does not guarantee future results. 
              Only invest what you can afford to lose.
            </p>
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
              I understand the risks involved and agree to the{" "}
              <span className="text-[#7C3AED] underline cursor-pointer">Terms and Conditions</span>{" "}
              and{" "}
              <span className="text-[#7C3AED] underline cursor-pointer">Risk Disclosure</span>
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
                  Processing...
                </>
              ) : (
                "Confirm Purchase"
              )}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
