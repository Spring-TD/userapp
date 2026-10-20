"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InfoOnAppDrawerProps {
  isOpen: boolean
  onClose: () => void
  onActivate: () => void
}

export default function InfoOnAppDrawer({ isOpen, onClose, onActivate }: InfoOnAppDrawerProps) {
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Info on App</h2>
              <p className="text-sm text-gray-600 text-center mb-8">
                write up on the activation or deactivation of the product
              </p>

              <div className="flex gap-4 w-full max-w-sm">
                <Button onClick={onActivate} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Activate App
                </Button>
                <Button onClick={onClose} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                  Deactivate App
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
