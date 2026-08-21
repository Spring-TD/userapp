import { apiClient } from '@/lib/api'

export type AmortizationPeriodStatus =
  | 'pending'
  | 'collecting'
  | 'paid'
  | 'failed'
  | 'overdue'
  | 'due'
  | 'upcoming'
  | string

export type AmortizationPeriod = {
  period?: number
  label?: string
  dueDate?: string
  payment?: number
  principal?: number
  interest?: number
  fees?: number
  balance?: number
  status?: AmortizationPeriodStatus
  isNext?: boolean
  paidAt?: string
}

export type AmortizationSchedule = {
  source?: 'indicative' | 'confirmed' | string
  interestMethod?: string
  interestRate?: number | string
  rate?: number | string
  loanAmount?: number
  instalment?: number
  installment?: number
  totalInterest?: number
  totalRepayment?: number
  periodCount?: number
  currency?: string
  planStatus?: string
  paidInstallmentCount?: number
  outstandingAmount?: number
  nextInstallmentNumber?: number
  periods?: AmortizationPeriod[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function pickNumber(...vals: unknown[]): number | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v.replace(/,/g, ''))
      if (Number.isFinite(n)) return n
    }
  }
  return undefined
}

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function pickBoolean(...vals: unknown[]): boolean | undefined {
  for (const v of vals) {
    if (typeof v === 'boolean') return v
  }
  return undefined
}

function pickRate(...vals: unknown[]): number | string | undefined {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function normalizePeriod(raw: unknown, index: number): AmortizationPeriod {
  const row = asRecord(raw) ?? {}
  const periodNumber = pickNumber(row.period, row.periodNumber, row.installmentNumber, index + 1)
  return {
    period: periodNumber,
    label: pickString(row.label, row.title, row.name) || `Payment ${periodNumber ?? index + 1}`,
    dueDate: pickString(row.dueDate, row.due_date, row.date),
    payment: pickNumber(row.payment, row.amount, row.instalment, row.installment),
    principal: pickNumber(row.principal, row.principalAmount),
    interest: pickNumber(row.interest, row.interestAmount),
    fees: pickNumber(row.fees, row.fee, row.feeAmount),
    balance: pickNumber(row.balance, row.remainingBalance, row.outstandingBalance),
    status: pickString(row.status) as AmortizationPeriodStatus | undefined,
    isNext: pickBoolean(row.isNext, row.next) === true,
    paidAt: pickString(row.paidAt, row.paid_at, row.collectedAt),
  }
}

/** Normalize schedule payloads from GET application or GET …/amortization-schedule. */
export function normalizeAmortizationSchedule(raw: unknown): AmortizationSchedule | null {
  const root = asRecord(raw)
  if (!root) return null

  const nested = asRecord(root.amortizationSchedule) || asRecord(root.schedule) || root
  const periodsRaw = nested.periods ?? nested.rows ?? nested.items
  if (!Array.isArray(periodsRaw) && nested.loanAmount == null && nested.totalRepayment == null) {
    return null
  }

  const periods = Array.isArray(periodsRaw)
    ? periodsRaw.map((item, index) => normalizePeriod(item, index))
    : []

  const paidFromPeriods = periods.filter(
    (row) => String(row.status || '').toLowerCase() === 'paid',
  ).length

  return {
    source: pickString(nested.source, nested.scheduleSource),
    interestMethod: pickString(nested.interestMethod, nested.method),
    interestRate: pickRate(nested.interestRate, nested.rate, nested.annualRate),
    rate: pickRate(nested.rate, nested.interestRate),
    loanAmount: pickNumber(nested.loanAmount, nested.principal, nested.amount),
    instalment: pickNumber(nested.instalment, nested.installment, nested.monthlyInstalment, nested.monthlyInstallment),
    installment: pickNumber(nested.installment, nested.instalment),
    totalInterest: pickNumber(nested.totalInterest, nested.interestTotal),
    totalRepayment: pickNumber(nested.totalRepayment, nested.totalPayable, nested.totalAmount),
    periodCount: pickNumber(nested.periodCount, nested.periodsCount, nested.paymentCount) ?? periods.length,
    currency: pickString(nested.currency) || 'NGN',
    planStatus: pickString(nested.planStatus, nested.status),
    paidInstallmentCount: pickNumber(nested.paidInstallmentCount, nested.paidCount) ?? paidFromPeriods,
    outstandingAmount: pickNumber(nested.outstandingAmount, nested.outstanding, nested.amountOutstanding),
    nextInstallmentNumber: pickNumber(nested.nextInstallmentNumber, nested.nextPeriod),
    periods,
  }
}

export function scheduleMonthlyInstalment(schedule: AmortizationSchedule): number | undefined {
  const topLevel = schedule.instalment ?? schedule.installment
  if (typeof topLevel === 'number' && Number.isFinite(topLevel)) return topLevel

  // Some confirmed plans omit a constant instalment (variable EMI / bullet). Fall back to next or first period.
  const periods = schedule.periods || []
  const next = periods.find((row) => row.isNext === true)
  const candidate = next?.payment ?? periods[0]?.payment
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate
  return undefined
}

export function formatScheduleMoney(amount: number | undefined | null, currency = 'NGN'): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return `${currency}—`
  const symbol = currency.toUpperCase() === 'NGN' ? '₦' : `${currency} `
  return `${symbol}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatScheduleDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isScheduleConfirmed(schedule?: AmortizationSchedule | null): boolean {
  return String(schedule?.source || '').toLowerCase() === 'confirmed'
}

export function isScheduleIndicative(schedule?: AmortizationSchedule | null): boolean {
  return String(schedule?.source || '').toLowerCase() === 'indicative'
}

/** Prefer live schedule rate from GET application; fall back to product/catalog rate. */
export function resolveScheduleInterestRateLabel(
  schedule?: AmortizationSchedule | null,
  fallback?: unknown,
): string | null {
  const fromSchedule = formatInterestRateLabel(schedule?.interestRate ?? schedule?.rate)
  if (fromSchedule) return fromSchedule
  if (typeof fallback === 'string' && fallback.trim()) {
    const trimmed = fallback.trim()
    return trimmed.includes('%') ? trimmed : `${trimmed}%`
  }
  return formatInterestRateLabel(fallback)
}

export function formatInterestRateLabel(rate: unknown): string | null {
  if (rate == null) return null
  if (typeof rate === 'string') {
    const trimmed = rate.trim()
    if (!trimmed) return null
    return trimmed.includes('%') ? trimmed : `${trimmed}%`
  }
  if (typeof rate === 'number' && Number.isFinite(rate)) {
    // Backend may send 18, 0.18, or 0.01 (percent). Prefer absolute % when > 1.
    const pct = rate > 0 && rate <= 1 ? rate * 100 : rate
    const pretty = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, '')
    return `${pretty}%`
  }
  return null
}

/** Interest paid so far — sum of paid period interest (0 when none paid yet). */
export function interestPaidFromSchedule(schedule: AmortizationSchedule): number {
  const periods = schedule.periods || []
  return periods
    .filter((row) => String(row.status || '').toLowerCase() === 'paid')
    .reduce((sum, row) => sum + (typeof row.interest === 'number' ? row.interest : 0), 0)
}

export function buildScheduleSectionNote(
  schedule: AmortizationSchedule,
  options?: { interestRateLabel?: string | null; interestMethod?: string | null },
): string {
  const currency = schedule.currency || 'NGN'
  const amount = formatScheduleMoney(schedule.loanAmount, currency)
  const rate =
    formatInterestRateLabel(schedule.interestRate ?? schedule.rate) || options?.interestRateLabel
  const methodRaw = schedule.interestMethod || options?.interestMethod || 'reducing balance'
  const method = String(methodRaw).replace(/[_-]+/g, ' ').toLowerCase()
  const source = String(schedule.source || '').toLowerCase()

  if (source === 'confirmed') {
    return `Confirmed repayment plan for a ${amount} loan${rate ? ` at ${rate} p.a.` : ''} on a ${method}.`
  }

  return `Indicative repayment plan for a ${amount} loan${rate ? ` at ${rate} p.a.` : ''} on a ${method}. The final schedule is confirmed once the application is approved and disbursed.`
}

export function isLoanDisbursedForSchedule(application: {
  status?: string | null
  loanWorkflowStatus?: string | null
  postApprovalFulfillment?: { status?: string | null; disbursedAt?: string | null } | null
  amortizationSchedule?: AmortizationSchedule | null
}): boolean {
  const status = String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const workflow = String(application.loanWorkflowStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const pafStatus = String(application.postApprovalFulfillment?.status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const source = String(application.amortizationSchedule?.source || '').toLowerCase()

  if (source === 'confirmed') return true
  if (application.postApprovalFulfillment?.disbursedAt) return true
  if (pafStatus === 'disbursed' || pafStatus === 'loan_disbursed') return true
  if (workflow.includes('disbursed') && !workflow.includes('awaiting')) return true
  if (status.includes('disbursed') && !status.includes('awaiting')) return true
  if (['active', 'completed', 'successful'].includes(status) && workflow.includes('disburs')) return true
  return false
}

/** Show schedule section when a payload exists (indicative or confirmed) or loan is disbursed. */
export function shouldShowAmortizationSchedule(options: {
  isLoan: boolean
  schedule?: AmortizationSchedule | null
  application?: {
    status?: string | null
    loanWorkflowStatus?: string | null
    postApprovalFulfillment?: { status?: string | null; disbursedAt?: string | null } | null
  } | null
}): boolean {
  if (!options.isLoan) return false
  if (options.schedule) return true
  if (!options.application) return false
  return isLoanDisbursedForSchedule({
    ...options.application,
    amortizationSchedule: options.schedule,
  })
}

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Lightweight schedule refresh.
 * GET /api/v1/applications/{id}/amortization-schedule?userId=
 */
export async function fetchAmortizationSchedule(
  applicationId: string,
  userId: string,
): Promise<{ ok: true; schedule: AmortizationSchedule } | { ok: false; error: string; status?: number }> {
  const id = String(applicationId || '').trim()
  const uid = String(userId || '').trim()
  if (!id) return { ok: false, error: 'Missing application id' }
  if (!uid) return { ok: false, error: 'Missing user id' }

  try {
    const qs = new URLSearchParams({ userId: uid })
    const res = await apiClient.get<ApiEnvelope<unknown>>(
      `/v1/applications/${encodeURIComponent(id)}/amortization-schedule?${qs}`,
      { includeAuth: true, timeout: 30_000 },
    )
    if (res.status >= 400 || res.data?.success === false) {
      return {
        ok: false,
        error: res.data?.error || res.data?.message || `Request failed (${res.status})`,
        status: res.status,
      }
    }
    const schedule = normalizeAmortizationSchedule(res.data?.data ?? res.data)
    if (!schedule) return { ok: false, error: 'Amortization schedule not available yet.', status: 404 }
    return { ok: true, schedule }
  } catch (error: unknown) {
    const status =
      error && typeof error === 'object' && 'response' in error
        ? Number((error as { response?: { status?: number } }).response?.status)
        : undefined
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not load amortization schedule',
      status,
    }
  }
}
