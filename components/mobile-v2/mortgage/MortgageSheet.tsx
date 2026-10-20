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
 * On md+ viewports, sheet is constrained to the 400px phone preview frame.
 */
export function MortgageSheet({ open, onClose, children, maxHeightClassName }: MortgageSheetProps) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={cn(
          'fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200',
          'md:inset-auto md:left-1/2 md:top-1/2 md:h-[850px] md:w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[40px]',
        )}
        onClick={onClose}
        aria-label="Dismiss"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[71] rounded-t-[28px] bg-white px-5 pb-8 pt-2 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom duration-300',
          'md:left-1/2 md:right-auto md:w-[400px] md:-translate-x-1/2',
          maxHeightClassName ?? 'max-h-[88vh] overflow-y-auto no-scrollbar',
        )}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" />
        {children}
      </div>
    </>
  )
}

export const MORTGAGE_PRIMARY = 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)] text-white'
