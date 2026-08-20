'use client'

import { cn } from '@/lib/utils'
import {
  buildScheduleSectionNote,
  formatInterestRateLabel,
  formatScheduleDate,
  formatScheduleMoney,
  interestPaidFromSchedule,
  scheduleMonthlyInstalment,
  type AmortizationSchedule,
} from '@/lib/amortizationSchedule'

type AmortizationScheduleSectionProps = {
  schedule: AmortizationSchedule
  interestRateLabel?: string | null
  interestMethod?: string | null
  className?: string
}

export function AmortizationScheduleSection({
  schedule,
  interestRateLabel,
  interestMethod,
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
  const interestPaid = interestPaidFromSchedule(schedule)
  const periods = schedule.periods || []

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-sm font-bold sf-text-ink">Amortization schedule</h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{note}</p>
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
      </div>

      <div className="space-y-2.5">
        {periods.map((period, index) => {
          const isNext = period.isNext === true
          const isPaid = String(period.status || '').toLowerCase() === 'paid'
          return (
            <div
              key={`${period.label || 'payment'}-${period.dueDate || index}`}
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
                  {isPaid ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Paid
                    </span>
                  ) : null}
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
        </span>
        <span>
          Interest paid:{' '}
          <strong className="font-bold sf-text-ink">{formatScheduleMoney(interestPaid, currency)}</strong>
        </span>
      </div>
    </section>
  )
}
