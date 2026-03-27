"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface WalletHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function WalletHistoryDrawer({ isOpen, onClose }: WalletHistoryDrawerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "relative ml-auto w-[45%] min-w-[400px] bg-white shadow-2xl",
              "border-l border-t border-b border-gray-200 flex flex-col max-h-screen",
              "rounded-tl-[40px] rounded-bl-[40px] pointer-events-auto",
            )}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>

            {/* Header */}
            <div className="px-12 py-8 border-b border-gray-200 rounded-tl-[40px] bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Wallet History</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-12 py-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">App Name</span>
                  <span className="font-medium">Loan product creation</span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">App Description</span>
                  <span className="font-medium">Complete description</span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">List of product</span>
                  <span className="font-medium">Product list</span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Date</span>
                  <span className="font-medium">Sep 12, 2025</span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Total users</span>
                  <span className="font-medium">18 Users</span>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-gray-100">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="text-green-600 font-medium">Successful</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-8 py-6">
              <div className="flex items-center justify-center gap-8">
                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#3061F5] flex items-center justify-center group-hover:bg-[#2451d4] transition-colors">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">Download</span>
                </button>

                <button className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 rounded-full bg-[#3061F5] flex items-center justify-center group-hover:bg-[#2451d4] transition-colors">
                    <Share2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">Share</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
