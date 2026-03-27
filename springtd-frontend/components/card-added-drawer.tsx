"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardAddedDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardNumber?: string
}

export const CardAddedDrawer = ({ open, onOpenChange, cardNumber = "5129 •••••••••12" }: CardAddedDrawerProps) => {
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
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-background shadow-md hover:bg-muted"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Card added successfully</h2>
                <p className="text-gray-600 mb-8">Card {cardNumber} 5129 •••••••••12 has been added successfully</p>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full bg-[#74612F] text-white py-4 rounded-lg font-medium hover:bg-[#D4C7A8] transition-colors mt-2"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
