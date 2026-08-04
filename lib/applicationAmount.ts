export function parseApplicationAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

const MONEY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
}

function formatNgnAmount(amount: number): string {
  return `NGN${amount.toLocaleString('en-NG', MONEY_FORMAT)}`
}

export function formatApplicationAmountHint(min?: number | null, max?: number | null): string {
  if (min != null && max != null) {
    return `Enter between ${formatNgnAmount(min)} and ${formatNgnAmount(max)}`
  }
  if (min != null) return `Minimum ${formatNgnAmount(min)}`
  if (max != null) return `Maximum ${formatNgnAmount(max)}`
  return 'Enter the amount you want to apply for'
}

export function validateApplicationAmount(
  amount: number,
  min?: number | null,
  max?: number | null,
): string | null {
  if (min != null && amount < min) {
    return `Amount must be at least ${formatNgnAmount(min)}`
  }
  if (max != null && amount > max) {
    return `Amount must not exceed ${formatNgnAmount(max)}`
  }
  return null
}

export function defaultApplicationAmountValue(
  amount?: number | null,
  amountMin?: number | null,
): string {
  if (amount != null && Number.isFinite(amount) && amount > 0) return String(amount)
  if (amountMin != null && Number.isFinite(amountMin) && amountMin > 0) return String(amountMin)
  return ''
}
