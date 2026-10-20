import { formatWalletBalance, walletTransactionMethodLabel, walletTransactionTitle } from '@/lib/userWallet'
import { SF_BRAND_DEFAULTS } from '@/lib/storefrontBranding'
import type { WalletTransaction } from '@/types/userWallet'

export type TransactionReceiptKind = 'WALLET' | 'WITHDRAWAL' | 'PAYMENT'

export type TransactionReceiptData = {
  id: string
  kind: TransactionReceiptKind
  title: string
  amount: number
  currency: string
  type: 'CREDIT' | 'DEBIT' | string
  status: string
  date: string
  reference?: string
  externalReference?: string
  description?: string
  method?: string
  balanceBefore?: number
  balanceAfter?: number
  accountHolder?: string
  destinationAccount?: string
  destinationBank?: string
  destinationName?: string
  narration?: string
}

function formatReceiptDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function walletTransactionToReceipt(
  transaction: WalletTransaction,
  options?: { accountHolder?: string; currency?: string },
): TransactionReceiptData {
  return {
    id: transaction.id,
    kind: 'WALLET',
    title: walletTransactionTitle(transaction),
    amount: transaction.amount,
    currency: options?.currency || 'NGN',
    type: transaction.type,
    status: transaction.status,
    date: transaction.createdAt,
    reference: transaction.referenceId,
    externalReference: transaction.externalReference,
    description: transaction.description,
    method: walletTransactionMethodLabel(transaction),
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    accountHolder: options?.accountHolder,
  }
}

export function withdrawalToReceipt(input: {
  amount: number
  currency: string
  status?: string
  date?: string
  reference?: string
  externalReference?: string
  narration?: string
  accountHolder?: string
  destinationAccount?: string
  destinationBank?: string
  destinationName?: string
  transactionId?: string
}): TransactionReceiptData {
  return {
    id: input.transactionId || input.reference || `withdrawal-${Date.now()}`,
    kind: 'WITHDRAWAL',
    title: 'Wallet withdrawal',
    amount: input.amount,
    currency: input.currency,
    type: 'DEBIT',
    status: input.status || 'COMPLETED',
    date: input.date || new Date().toISOString(),
    reference: input.reference,
    externalReference: input.externalReference,
    narration: input.narration,
    accountHolder: input.accountHolder,
    destinationAccount: input.destinationAccount,
    destinationBank: input.destinationBank,
    destinationName: input.destinationName,
    method: 'Bank transfer',
  }
}

function receiptRows(receipt: TransactionReceiptData): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ['Receipt ID', receipt.id],
    ['Transaction type', receipt.type],
    ['Status', receipt.status],
    ['Date', formatReceiptDate(receipt.date)],
    ['Amount', formatWalletBalance(receipt.amount, receipt.currency)],
  ]

  if (receipt.title) rows.push(['Description', receipt.title])
  if (receipt.method) rows.push(['Payment method', receipt.method])
  if (receipt.reference) rows.push(['Reference', receipt.reference])
  if (receipt.externalReference) rows.push(['Provider reference', receipt.externalReference])
  if (receipt.narration) rows.push(['Narration', receipt.narration])
  if (receipt.accountHolder) rows.push(['Account holder', receipt.accountHolder])
  if (receipt.destinationName) rows.push(['Beneficiary name', receipt.destinationName])
  if (receipt.destinationBank) rows.push(['Destination bank', receipt.destinationBank])
  if (receipt.destinationAccount) rows.push(['Destination account', receipt.destinationAccount])
  if (receipt.balanceBefore != null) {
    rows.push(['Balance before', formatWalletBalance(receipt.balanceBefore, receipt.currency)])
  }
  if (receipt.balanceAfter != null) {
    rows.push(['Balance after', formatWalletBalance(receipt.balanceAfter, receipt.currency)])
  }

  return rows
}

type ReceiptBrandColors = {
  pageBg: string
  ink: string
  primary: string
  button: string
  accentSoft: string
  borderSubtle: string
}

function readStorefrontBrandColors(): ReceiptBrandColors {
  if (typeof document === 'undefined') {
    return {
      pageBg: SF_BRAND_DEFAULTS.pageBg,
      ink: SF_BRAND_DEFAULTS.ink,
      primary: SF_BRAND_DEFAULTS.primary,
      button: SF_BRAND_DEFAULTS.button,
      accentSoft: SF_BRAND_DEFAULTS.accentSoft,
      borderSubtle: '#e2e8f0',
    }
  }

  const root = document.querySelector('.sf-storefront-root') ?? document.documentElement
  const style = getComputedStyle(root)

  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback

  return {
    pageBg: read('--sf-page-bg', SF_BRAND_DEFAULTS.pageBg),
    ink: read('--sf-ink', SF_BRAND_DEFAULTS.ink),
    primary: read('--sf-primary', SF_BRAND_DEFAULTS.primary),
    button: read('--sf-button', SF_BRAND_DEFAULTS.button),
    accentSoft: read('--sf-accent-soft', SF_BRAND_DEFAULTS.accentSoft),
    borderSubtle: read('--sf-border-subtle', '#e2e8f0'),
  }
}

export function buildReceiptHtml(receipt: TransactionReceiptData): string {
  const brand = readStorefrontBrandColors()
  const rows = receiptRows(receipt)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:color-mix(in srgb, ${brand.ink} 55%, #94a3b8);font-size:13px;width:42%;vertical-align:top;">${label}</td>
          <td style="padding:10px 0;color:${brand.ink};font-size:13px;font-weight:600;vertical-align:top;">${value}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Transaction Receipt - ${receipt.id}</title>
  <style>
    body { font-family: Arial, sans-serif; background:${brand.pageBg}; margin:0; padding:32px; color:${brand.ink}; }
    .card { max-width:640px; margin:0 auto; background:#fff; border-radius:16px; padding:32px; box-shadow:0 10px 30px color-mix(in srgb, ${brand.ink} 8%, transparent); border-top:4px solid ${brand.button}; }
    h1 { margin:0 0 8px; font-size:24px; color:${brand.ink}; }
    .meta { color:color-mix(in srgb, ${brand.ink} 55%, #94a3b8); font-size:13px; margin-bottom:24px; }
    .amount { font-size:32px; font-weight:700; margin:16px 0 24px; color:${receipt.type === 'CREDIT' ? '#059669' : '#DC2626'}; }
    table { width:100%; border-collapse:collapse; }
    .footer { margin-top:28px; padding-top:16px; border-top:1px solid ${brand.borderSubtle}; color:color-mix(in srgb, ${brand.ink} 45%, #94a3b8); font-size:12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Transaction Receipt</h1>
    <p class="meta">${receipt.kind === 'WITHDRAWAL' ? 'Withdrawal confirmation' : 'Payment confirmation'}</p>
    <div class="amount">${formatWalletBalance(receipt.amount, receipt.currency)}</div>
    <table>${rows}</table>
    <div class="footer">Generated by Spring. Keep this receipt for your records.</div>
  </div>
</body>
</html>`
}

export function buildReceiptText(receipt: TransactionReceiptData): string {
  const lines = [
    'Transaction Receipt',
    '===================',
    ...receiptRows(receipt).map(([label, value]) => `${label}: ${value}`),
    '',
    'Generated by Spring.',
  ]
  return lines.join('\n')
}

export function downloadReceipt(receipt: TransactionReceiptData): void {
  const html = buildReceiptHtml(receipt)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `receipt-${receipt.id}.html`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function printReceipt(receipt: TransactionReceiptData): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
  if (!popup) return
  popup.document.write(buildReceiptHtml(receipt))
  popup.document.close()
  popup.focus()
  popup.print()
}

export function emailReceipt(receipt: TransactionReceiptData, email: string): void {
  const subject = encodeURIComponent(`Transaction receipt - ${formatWalletBalance(receipt.amount, receipt.currency)}`)
  const body = encodeURIComponent(buildReceiptText(receipt))
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
}
