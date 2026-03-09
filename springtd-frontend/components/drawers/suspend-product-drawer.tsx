"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuspendProductDrawerProps {
  isOpen: boolean
  onClose: () => void
  onDeactivate: () => void
}

export default function SuspendProductDrawer({ isOpen, onClose, onDeactivate }: SuspendProductDrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
              onClick={onClose}
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50"
            >
              <X className="h-5 w-5 text-gray-900" />
            </button>

            {/* Header */}
            <div className="px-12 py-8 border-b border-gray-200 rounded-tl-[40px] bg-white">
              <h2 className="text-xl font-semibold text-gray-900">Info on App</h2>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-12 py-16">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-center text-gray-600 mb-12 max-w-md">
                write up on the activation or deactivation of the product
              </p>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-[#3061F5] hover:bg-[#2451d4] text-white rounded-lg font-medium transition-colors"
                >
                  Activate App
                </button>
                <button
                  onClick={onDeactivate}
                  className="px-8 py-3 bg-[#F44336] hover:bg-[#da190b] text-white rounded-lg font-medium transition-colors"
                >
                  Deactivate App
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
