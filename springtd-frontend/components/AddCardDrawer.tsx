"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddCardDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

export const AddCardDrawer: React.FC<AddCardDrawerProps> = ({ open, onOpenChange, onSubmit }) => {
  const [form, setForm] = React.useState({
    cardName: "",
    cardNumber: "",
    cvv: "",
    expiry: "",
    billing: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
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
              className="absolute -left-20 top-6 h-10 w-10 flex items-center justify-center rounded-full bg-background shadow-md hover:bg-muted"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            {/* Content */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col justify-center px-8 py-10 space-y-8 max-w-md mx-auto w-full"
            >
              <input
                type="text"
                name="cardName"
                value={form.cardName}
                onChange={handleChange}
                placeholder="Card Name"
                className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <input
                type="text"
                name="cardNumber"
                value={form.cardNumber}
                onChange={handleChange}
                placeholder="Card Number"
                className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <input
                type="text"
                name="cvv"
                value={form.cvv}
                onChange={handleChange}
                placeholder="CVV"
                className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <input
                type="text"
                name="expiry"
                value={form.expiry}
                onChange={handleChange}
                placeholder="Expiry Date"
                className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <input
                type="text"
                name="billing"
                value={form.billing}
                onChange={handleChange}
                placeholder="Billing Address"
                className="w-full h-[60px] text-base border border-gray-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-black"
              />

              <button
                type="submit"
                className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
              >
                Add card
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
