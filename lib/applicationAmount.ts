export function parseApplicationAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const amount = Number(cleaned)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return amount
}

export function formatApplicationAmountHint(min?: number | null, max?: number | null): string {
  if (min != null && max != null) {
    return `Enter between NGN${min.toLocaleString('en-NG')} and NGN${max.toLocaleString('en-NG')}`
  }
  if (min != null) return `Minimum NGN${min.toLocaleString('en-NG')}`
  if (max != null) return `Maximum NGN${max.toLocaleString('en-NG')}`
  return 'Enter the amount you want to apply for'
}

export function validateApplicationAmount(
  amount: number,
  min?: number | null,
  max?: number | null,
): string | null {
  if (min != null && amount < min) {
    return `Amount must be at least NGN${min.toLocaleString('en-NG')}`
  }
  if (max != null && amount > max) {
    return `Amount must not exceed NGN${max.toLocaleString('en-NG')}`
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
