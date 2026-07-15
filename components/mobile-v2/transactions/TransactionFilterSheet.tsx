'use client'

import { X } from 'lucide-react'

export type TransactionFilters = {
  type: '' | 'CREDIT' | 'DEBIT'
  startDate: string
  endDate: string
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  type: '',
  startDate: '',
  endDate: '',
}

export function TransactionFilterSheet({
  filters,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  onApply: () => void
  onReset: () => void
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-[70] flex items-end">
      <button type="button" aria-label="Close filters" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-[71] w-full rounded-t-[28px] bg-white px-5 pb-8 pt-3 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-300" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold sf-text-ink">Filter transactions</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full sf-accent-soft">
            <X className="h-4 w-4 sf-text-ink" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold sf-text-ink">Transaction type</label>
            <select
              value={filters.type}
              onChange={(event) =>
                onChange({ ...filters, type: event.target.value as TransactionFilters['type'] })
              }
              className="mt-2 h-11 w-full rounded-xl border sf-border-subtle bg-white px-4 text-sm sf-text-ink"
            >
              <option value="">All types</option>
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold sf-text-ink">Start date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => onChange({ ...filters, startDate: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border sf-border-subtle bg-white px-4 text-sm sf-text-ink"
              />
            </div>
            <div>
              <label className="text-xs font-semibold sf-text-ink">End date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => onChange({ ...filters, endDate: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border sf-border-subtle bg-white px-4 text-sm sf-text-ink"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onReset}
            className="sf-btn-outline h-11 rounded-xl text-sm font-semibold"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className="sf-btn h-11 rounded-xl text-sm font-semibold"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  )
}
