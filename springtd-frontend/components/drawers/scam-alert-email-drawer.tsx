"use client"

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ScamAlertEmailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string) => void
}

export default function ScamAlertEmailDrawer({ open, onOpenChange, onSubmit }: ScamAlertEmailDrawerProps) {
  const [email, setEmail] = useState("")

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      onSubmit(email)
      setEmail("")
    }
  }

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
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
              <div className="max-w-md mx-auto w-full space-y-6">
                {/* Title */}
                <h2 className="text-3xl font-semibold text-gray-900 text-center">Enter your email</h2>

                {/* Subtitle */}
                <p className="text-gray-600 text-center">kindly enter your email to deactivate your account</p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6 mt-8">
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
                      className="w-full h-12"
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
