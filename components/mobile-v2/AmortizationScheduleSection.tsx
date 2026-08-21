'use client'

import { Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  buildScheduleSectionNote,
  formatInterestRateLabel,
  formatScheduleDate,
  formatScheduleMoney,
  interestPaidFromSchedule,
  isScheduleConfirmed,
  scheduleMonthlyInstalment,
  type AmortizationSchedule,
} from '@/lib/amortizationSchedule'

type AmortizationScheduleSectionProps = {
  schedule: AmortizationSchedule
  interestRateLabel?: string | null
  interestMethod?: string | null
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
  className?: string
}

function periodStatusBadge(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Paid
      </span>
    )
  }
  if (normalized === 'overdue') {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
        Overdue
      </span>
    )
  }
  if (normalized === 'failed') {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
        Failed
      </span>
    )
  }
  if (normalized === 'collecting') {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
        Collecting
      </span>
    )
  }
  return null
}

export function AmortizationScheduleSection({
  schedule,
  interestRateLabel,
  interestMethod,
  onRefresh,
  refreshing = false,
  className,
}: AmortizationScheduleSectionProps) {
  const currency = schedule.currency || 'NGN'
  const monthly = scheduleMonthlyInstalment(schedule)
  const note = buildScheduleSectionNote(schedule, {
    interestRateLabel:
      formatInterestRateLabel(schedule.interestRate ?? schedule.rate) || interestRateLabel,
    interestMethod: schedule.interestMethod || interestMethod,
  })
  const periodCount = schedule.periodCount || schedule.periods?.length || 0
  const paidCount = schedule.paidInstallmentCount ?? 0
  const interestPaid = interestPaidFromSchedule(schedule)
  const periods = schedule.periods || []
  const confirmed = isScheduleConfirmed(schedule)

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold sf-text-ink">Amortization schedule</h2>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{note}</p>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={() => void onRefresh()}
            className="h-8 shrink-0 gap-1.5 px-2 text-xs text-gray-500"
            aria-label="Refresh repayment schedule"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
          <p className="text-[11px] text-gray-500">Loan amount</p>
          <p className="mt-1 text-sm font-bold sf-text-ink">
            {formatScheduleMoney(schedule.loanAmount, currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
          <p className="text-[11px] text-gray-500">Monthly installment</p>
          <p className="mt-1 text-sm font-bold sf-text-ink">{formatScheduleMoney(monthly, currency)}</p>
        </div>
        <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
          <p className="text-[11px] text-gray-500">Total interest</p>
          <p className="mt-1 text-sm font-bold sf-text-ink">
            {formatScheduleMoney(schedule.totalInterest, currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
          <p className="text-[11px] text-gray-500">Total repayment</p>
          <p className="mt-1 text-sm font-bold sf-text-ink">
            {formatScheduleMoney(schedule.totalRepayment, currency)}
          </p>
        </div>
        {confirmed && schedule.outstandingAmount != null ? (
          <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
            <p className="text-[11px] text-gray-500">Outstanding</p>
            <p className="mt-1 text-sm font-bold sf-text-ink">
              {formatScheduleMoney(schedule.outstandingAmount, currency)}
            </p>
          </div>
        ) : null}
        {confirmed ? (
          <div className="rounded-2xl bg-[var(--sf-tint,#F4F6FB)] px-4 py-3.5">
            <p className="text-[11px] text-gray-500">Paid installments</p>
            <p className="mt-1 text-sm font-bold sf-text-ink">
              {paidCount} of {periodCount}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5">
        {periods.map((period, index) => {
          const isNext = period.isNext === true
          const isPaid = String(period.status || '').toLowerCase() === 'paid'
          return (
            <div
              key={`${period.period || period.label || 'payment'}-${period.dueDate || index}`}
              className={cn(
                'rounded-2xl border px-4 py-3.5',
                isNext
                  ? 'border-[var(--sf-button,#2F5FE3)] bg-[color-mix(in_srgb,var(--sf-button,#2F5FE3)_6%,white)]'
                  : 'border-[var(--sf-border,#E7EAF3)] bg-white',
                isPaid && 'opacity-70',
              )}
            >
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="text-xs font-bold sf-text-ink">{period.label || `Payment ${index + 1}`}</p>
                  {isNext ? (
                    <span className="rounded-full bg-[var(--sf-button,#2F5FE3)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Next
                    </span>
                  ) : null}
                  {periodStatusBadge(period.status)}
                </div>
                <p className="shrink-0 text-sm font-bold sf-text-ink">
                  {formatScheduleMoney(period.payment, currency)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-[var(--sf-border,#E7EAF3)] pt-2.5">
                <div>
                  <p className="text-[11px] text-gray-500">Due date</p>
                  <p className="mt-0.5 text-xs font-semibold sf-text-ink">
                    {formatScheduleDate(period.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Principal</p>
                  <p className="mt-0.5 text-xs font-semibold sf-text-ink">
                    {formatScheduleMoney(period.principal, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">Balance</p>
                  <p className="mt-0.5 text-xs font-semibold sf-text-ink">
                    {formatScheduleMoney(period.balance, currency)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <span>
          {periodCount} payment{periodCount === 1 ? '' : 's'}
          {confirmed && paidCount > 0 ? ` · ${paidCount} paid` : ''}
        </span>
        <span>
          Interest paid:{' '}
          <strong className="font-bold sf-text-ink">{formatScheduleMoney(interestPaid, currency)}</strong>
        </span>
      </div>
    </section>
  )
}
