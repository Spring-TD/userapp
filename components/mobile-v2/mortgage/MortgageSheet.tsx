'use client'

import React from 'react'
import { cn } from '@/lib/utils'

type MortgageSheetProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Taller sheet for long forms */
  maxHeightClassName?: string
}

/**
 * Bottom sheet overlay matching mobile mortgage mockups (handle, dimmed backdrop).
 */
export function MortgageSheet({ open, onClose, children, maxHeightClassName }: MortgageSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Dismiss"
      />
      <div
        className={cn(
          'relative z-[71] w-full rounded-t-[28px] bg-white px-5 pb-8 pt-2 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300',
          maxHeightClassName ?? 'max-h-[88vh] overflow-y-auto no-scrollbar',
        )}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" />
        {children}
      </div>
    </div>
  )
}

export const MORTGAGE_PRIMARY = 'bg-[#2E5AAC] hover:bg-[#265499] text-white'
