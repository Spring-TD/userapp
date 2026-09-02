'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SAVINGS_CARD_OVERLAY_CLASS } from '@/lib/savingsCardTheme'

type Props = {
  gradientClass: string
  className?: string
  children: ReactNode
}

/** Hot Savings / user savings account shell with gradient + dark overlay. */
export function SavingsGradientCard({ gradientClass, className, children }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] text-white shadow-[0_12px_24px_-12px_rgba(23,19,33,0.34)]',
        gradientClass,
        className,
      )}
    >
      <span className={SAVINGS_CARD_OVERLAY_CLASS} aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
