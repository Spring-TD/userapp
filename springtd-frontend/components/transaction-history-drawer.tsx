"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, Share } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface BillingRecord {
  date: string
  amount: string
  status: "Successful" | "Failed" | "Pending"
  method: string
  transactionId: string
  downloadable: boolean
}

interface TransactionHistoryDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: BillingRecord | null
  onDownload?: () => void
  onShare?: () => void
}

const TransactionDetailRow = ({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) => (
  <div
    className={cn(
      "flex justify-between items-center py-4 border-b border-transaction-border last:border-b-0",
      className,
    )}
  >
    <span className="text-sm text-transaction-label font-light">{label}</span>
    <div className="text-right">{value}</div>
  </div>
)

const StatusBadge = ({ status }: { status: BillingRecord["status"] }) => {
  const statusColors = {
    Successful: "bg-green-100 text-green-600 border-green-200",
    Failed: "bg-red-100 text-red-600 border-red-200",
    Pending: "bg-amber-100 text-amber-600 border-amber-200",
  }

  return (
    <span
      className={cn("inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border", statusColors[status])}
    >
      {status}
    </span>
  )
}

export const TransactionHistoryDrawer = ({
  open,
  onOpenChange,
  record,
  onDownload,
  onShare,
}: TransactionHistoryDrawerProps) => {
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
      {open && record && (
        <div
          className="fixed inset-0 z-50 flex pointer-events-none"
          // backdrop + drawer wrapper
        >
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
              "relative ml-auto w-[45%] min-w-[400px] bg-background shadow-2xl",
              "border-l border-t border-b border-border flex flex-col max-h-screen",
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

            {/* Header */}
            <div className="px-12 py-12  rounded-tl-[40px] bg-background">
              <h2 className="text-center text-xl font-semibold text-transaction-value pr-8">
                Transaction History {record.transactionId}
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 px-12 py-12 space-y-2">
              <TransactionDetailRow
                label="Payment for"
                value={<span className="text-sm font-medium text-transaction-value">Loan product creation</span>}
              />
              <TransactionDetailRow
                label="Amount"
                value={<span className="text-lg font-bold text-transaction-value">{record.amount}</span>}
              />
              <TransactionDetailRow
                label="Transaction ID"
                value={<span className="text-sm font-medium text-transaction-value">{record.transactionId}</span>}
              />
              <TransactionDetailRow
                label="Date"
                value={<span className="text-sm font-medium text-transaction-value">{record.date}</span>}
              />
              <TransactionDetailRow label="Status" value={<StatusBadge status={record.status} />} />
              <TransactionDetailRow
                label="Initiated by"
                value={
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/grace.png" alt="Grace Ayo" />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">GA</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-transaction-value">Grace Ayo</span>
                      <span className="text-xs text-transaction-label">grace.yo@spring.td</span>
                    </div>
                  </div>
                }
                className="pb-0 border-b-0"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-center gap-32 px-8 py-12 mb-[150px] bg-background rounded-bl-[40px]">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={onDownload}
                  className="h-14 w-14 rounded-full bg-[#E0D8C3] flex items-center justify-center"
                >
                  <Download className="h-5 w-5" style={{ color: "#9A813F" }} />
                </button>
                <span className="text-xs text-transaction-label font-medium">Download</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={onShare}
                  className="h-14 w-14 rounded-full bg-[#E0D8C3] flex items-center justify-center"
                >
                  <Share className="h-5 w-5" style={{ color: "#9A813F" }} />
                </button>
                <span className="text-xs text-transaction-label font-medium">Share</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
