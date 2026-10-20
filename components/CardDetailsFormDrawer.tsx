"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardDetailsFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (formData: any) => void
}

const CardBrandIcon: React.FC<{ brand: "visa" | "mastercard" | null }> = ({ brand }) => {
  if (brand === "visa") {
    return <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">VISA</div>
  }
  if (brand === "mastercard") {
    return (
      <div className="flex">
        <div className="w-6 h-4 bg-red-500 rounded-l-full"></div>
        <div className="w-6 h-4 bg-yellow-400 rounded-r-full -ml-2"></div>
      </div>
    )
  }
  return null
}

export const CardDetailsFormDrawer = ({ open, onOpenChange, onSubmit }: CardDetailsFormDrawerProps) => {
  const [formData, setFormData] = React.useState({
    name: "",
    number: "",
    cvv: "",
    expiryDate: "",
    billingAddress: "",
  })

  const detectCardBrand = (number: string): "visa" | "mastercard" | null => {
    const cleaned = number.replace(/\s/g, "")
    if (cleaned.startsWith("4")) return "visa"
    if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "mastercard"
    return null
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "")
    const formatted = cleaned.replace(/(.{4})/g, "$1 ").trim()
    return formatted.substring(0, 19)
  }

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value)
    setFormData((prev) => ({ ...prev, number: formatted }))
  }

  const handleSubmit = () => {
    onSubmit(formData)
    setFormData({
      name: "",
      number: "",
      cvv: "",
      expiryDate: "",
      billingAddress: "",
    })
  }

  // ESC close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [open, onOpenChange])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "relative ml-auto w-[45%] min-w-[400px] bg-white shadow-2xl",
              "border-l border-t border-b border-gray-200 flex flex-col max-h-screen",
              "rounded-tl-[40px] rounded-bl-[40px] pointer-events-auto",
            )}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute -left-12 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>

            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 rounded-tl-[40px] bg-white">
              <h2 className="text-center text-xl font-semibold text-gray-900 pr-8">Add Card</h2>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-6 overflow-y-auto space-y-4">
              <input
                type="text"
                placeholder="Card Name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />

              <div className="relative">
                <input
                  type="text"
                  placeholder="Card Number"
                  value={formData.number}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent pl-12 text-gray-900 placeholder-gray-500"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <CardBrandIcon brand={detectCardBrand(formData.number)} />
                </div>
              </div>

              <input
                type="text"
                placeholder="CVV"
                value={formData.cvv}
                onChange={(e) => setFormData((prev) => ({ ...prev, cvv: e.target.value }))}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />

              <input
                type="text"
                placeholder="Expiry Date"
                value={formData.expiryDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />

              <input
                type="text"
                placeholder="Billing Address"
                value={formData.billingAddress}
                onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress: e.target.value }))}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>

            {/* Footer */}
            <div className="px-8 py-8 bg-white rounded-bl-[40px]">
              <button
                onClick={handleSubmit}
                className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Add card
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
