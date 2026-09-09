'use client'

import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SAVINGS_CARD_OVERLAY_CLASS } from '@/lib/savingsCardTheme'

type Props = {
  /** CSS `linear-gradient(...)` (preferred) or a leftover `bg-[...]` class. */
  gradientClass: string
  className?: string
  children: ReactNode
}

function gradientStyle(gradientClass: string): CSSProperties | undefined {
  const value = gradientClass.trim()
  if (!value) return undefined
  if (value.startsWith('linear-gradient')) {
    return { backgroundImage: value }
  }
  return undefined
}

/** Hot Savings / user savings account shell with gradient + dark overlay. */
export function SavingsGradientCard({ gradientClass, className, children }: Props) {
  const style = gradientStyle(gradientClass)
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] text-white shadow-[0_12px_24px_-12px_rgba(23,19,33,0.34)]',
        !style && gradientClass,
        className,
      )}
      style={style}
    >
      <span className={SAVINGS_CARD_OVERLAY_CLASS} aria-hidden />
      <div className="relative z-[1]">{children}</div>
    </div>
  )
}
