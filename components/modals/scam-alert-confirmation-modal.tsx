"use client"

import { X, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface ScamAlertConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ScamAlertConfirmationModal({ isOpen, onClose, onConfirm }: ScamAlertConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 pointer-events-auto relative"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-4 -left-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>

              {/* Content */}
              <div className="p-12 flex flex-col items-center text-center">
                {/* Alert Icon */}
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Are you sure</h2>

                {/* Subtitle */}
                <p className="text-gray-600 mb-8">Your account is Under attack?</p>

                {/* Yes Button */}
                <Button
                  onClick={onConfirm}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-lg text-base font-medium"
                >
                  Yes
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
