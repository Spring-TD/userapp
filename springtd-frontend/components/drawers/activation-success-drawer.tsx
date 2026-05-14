"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ActivationSuccessDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function ActivationSuccessDrawer({ isOpen, onClose }: ActivationSuccessDrawerProps) {
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[45%] min-w-[400px] bg-white shadow-2xl z-50 rounded-tl-[40px] rounded-bl-[40px] border-l border-t border-b border-gray-200 flex flex-col max-h-screen pointer-events-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute -left-20 top-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Activation successfully</h2>
              <p className="text-sm text-gray-600 text-center mb-8">product has been activated</p>

              <Button onClick={onClose} className="w-full max-w-sm bg-[#9A813F] hover:bg-[#8A7335] text-white">
                Continue
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
