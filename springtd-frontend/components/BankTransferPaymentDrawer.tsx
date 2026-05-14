"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FaCopy } from "react-icons/fa"

interface BankDetails {
  accountNumber: string
  accountName: string
  bankName: string
}

interface BankTransferPaymentDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bankDetails: BankDetails
  onPay: () => void
}

export const BankTransferPaymentDrawer = ({
  open,
  onOpenChange,
  bankDetails,
  onPay,
}: BankTransferPaymentDrawerProps) => {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(bankDetails.accountNumber)
  }

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
              "border-l border-gray-200 flex flex-col max-h-screen",
              "rounded-tl-[40px] rounded-bl-[40px] pointer-events-auto",
            )}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-background shadow-md hover:bg-muted"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            {/* Header (centered, no border, with margin) */}
            <div className="px-8 pb-4 mt-[80px] text-center">
              <h2 className="text-xl font-semibold text-gray-900">Payment via bank transfer</h2>
              <p className="text-sm text-gray-500 mt-1">Make a transfer to your account details below</p>
            </div>

            {/* Content */}
            <div className="flex-1 px-8 py-8 overflow-y-auto">
              <div className="max-w-md mx-auto space-y-12">
                {/* Instructions */}
                <ol className="list-decimal list-inside space-y-8 text-gray-700 text-sm leading-relaxed">
                  <li>Open your Bank App</li>
                  <li>
                    Make payment into account details below:
                    {/* Account box */}
                    <div className="mt-3 border border-dashed border-gray-300 rounded-lg p-4 bg-[#F8F8FF] flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg text-gray-900">{bankDetails.accountNumber}</p>
                        <p className="text-sm text-gray-700">{bankDetails.accountName}</p>
                        <p className="text-sm text-gray-500">{bankDetails.bankName}</p>
                      </div>
                      <button onClick={handleCopy} className="ml-4 text-black hover:text-gray-800">
                        <FaCopy className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                  <li>
                    Transfer money from the account of <span className="font-medium">“Allowed users”</span> with active
                    KYC below. <br />
                    <span className="text-red-600 italic">Third Party Funding is not allowed.</span>
                  </li>
                  <li>
                    Click <span className="font-medium">“I have Paid”</span>. We will confirm payment and add the funds
                    to your wallet.
                  </li>
                </ol>

                {/* Pay button */}
                <button
                  onClick={onPay}
                  className="w-full bg-black text-white py-4 rounded-md font-medium hover:bg-gray-800 transition-colors"
                >
                  I have paid
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
