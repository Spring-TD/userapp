import type { MobileProduct } from "@/lib/storefrontProducts"
import type { StorefrontApplication } from "@/lib/storefrontApplicationClient"

export type LoanApplicationDetails = {
  title: string
  status: string
  workflowStatus: string
  disbursementDate: string
  loanAmount: string
  loanId: string
  automation: string
  interest: string
  totalToRepay: string
  bankName: string
  poweredBy: string
}

function formatNgn(amount?: number | null, currency = "NGN"): string {
  if (amount == null || !Number.isFinite(amount)) return `${currency}—`
  const symbol = currency === "NGN" ? "N" : `${currency} `
  return `${symbol}${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function parseRatePercent(rate?: string | null): number | null {
  if (!rate) return null
  const match = String(rate).match(/([\d.]+)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function isApprovedStatus(status?: string): boolean {
  const normalized = String(status || "").toLowerCase()
  return ["approved", "active", "disbursed", "successful", "completed"].some((s) =>
    normalized.includes(s),
  )
}

function formatStatusLabel(status?: string | null, fallback = "Pending"): string {
  const raw = String(status || "").trim()
  if (!raw) return fallback
  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function loanReference(application: StorefrontApplication): string {
  const raw = String(application.id ?? application._id ?? "").trim()
  if (!raw) return "—"
  const compact = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (compact.length >= 8) return compact.slice(-9)
  return compact || "—"
}

function accountBankName(application: StorefrontApplication): string {
  return (
    application.productWallet?.upstreamAccount?.bankName ||
    application.account?.bankName ||
    application.productName ||
    "—"
  )
}

function estimateInterestAmount(amount: number, product?: MobileProduct | null): number {
  const rate = parseRatePercent(product?.interestRate)
  if (!rate) return 0
  return Math.round(amount * (rate / 100))
}

export function buildLoanApplicationDetails(
  application: StorefrontApplication,
  options?: {
    product?: MobileProduct | null
    providerName?: string
  },
): LoanApplicationDetails {
  const amount = typeof application.amount === "number" ? application.amount : 0
  const currency = application.currency || "NGN"
  const interestAmount = estimateInterestAmount(amount, options?.product)
  const approved = isApprovedStatus(application.status) || isApprovedStatus(application.loanWorkflowStatus)

  const automation =
    options?.product?.repaymentFrequency?.trim() ||
    String((application as Record<string, unknown>).repaymentFrequency || "").trim() ||
    "Monthly"

  const disbursementSource = approved
    ? application.updatedAt || application.createdAt
    : application.createdAt || application.updatedAt

  const status = formatStatusLabel(application.status, "Pending")
  const workflowStatus = formatStatusLabel(
    application.loanWorkflowStatus,
    status,
  )

  return {
    title: approved ? "Loan Approved" : "Loan Application Details",
    status,
    workflowStatus,
    disbursementDate: formatDate(disbursementSource),
    loanAmount: formatNgn(amount, currency),
    loanId: loanReference(application),
    automation,
    interest: formatNgn(interestAmount, currency),
    totalToRepay: formatNgn(amount + interestAmount, currency),
    bankName: accountBankName(application),
    poweredBy: options?.providerName || application.productName || accountBankName(application),
  }
}
