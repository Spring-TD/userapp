'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PepAnswer, SpouseRepaymentAnswer } from '@/lib/applicantProfileFields'

const BRAND_INK = 'text-[var(--sf-ink,#1E293B)]'

export function SelectField({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: readonly string[]
}) {
  return (
    <label className="relative flex h-12 items-center rounded-2xl bg-gray-100 px-4 ring-[var(--sf-button,#1E40AF)]/20 focus-within:ring-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-w-0 flex-1 appearance-none bg-transparent text-[12px] focus:outline-none',
          value ? BRAND_INK : 'text-gray-400',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/\b\w/g, (c) => c.toUpperCase())}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-gray-400" />
    </label>
  )
}

export function YesNoField({
  value,
  onChange,
  label,
}: {
  value: PepAnswer | SpouseRepaymentAnswer
  onChange: (value: 'yes' | 'no') => void
  label: string
}) {
  return (
    <div className="space-y-2">
      <p className={`text-xs font-medium ${BRAND_INK}`}>{label}</p>
      <div className="grid grid-cols-2 gap-3">
        {(['yes', 'no'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'h-11 rounded-2xl text-xs font-semibold capitalize',
              value === option
                ? 'bg-[var(--sf-button,#1E40AF)] text-white'
                : 'bg-gray-100 text-gray-600',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PepSearchNotice({ isPep }: { isPep: boolean }) {
  if (!isPep) return null
  return (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
      Because you selected Yes, a PEP search will be run as part of compliance review before your
      application proceeds.
    </p>
  )
}
