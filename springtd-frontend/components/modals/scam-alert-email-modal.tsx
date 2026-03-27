"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ScamAlertEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => void
}

export default function ScamAlertEmailModal({ isOpen, onClose, onSubmit }: ScamAlertEmailModalProps) {
  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      onSubmit(email)
      setEmail("")
    }
  }

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
              <div className="p-12">
                {/* Title */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-2 text-center">Enter your email</h2>

                {/* Subtitle */}
                <p className="text-gray-600 mb-8 text-center">kindly enter your email to deactivate your account</p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Input */}
                  <div>
                    <label htmlFor="email" className="block text-sm text-gray-600 mb-2">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full"
                      required
                    />
                  </div>

                  {/* Deactivate Button */}
                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-lg text-base font-medium"
                  >
                    Deactivate
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
