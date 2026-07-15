"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { buildLoanApplicationDetails } from "@/lib/loanApplicationDetails"
import type { MobileProduct } from "@/lib/storefrontProducts"
import type { StorefrontApplication } from "@/lib/storefrontApplicationClient"

const BRAND_INK = "text-[var(--sf-ink,#1E293B)]"

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`max-w-[58%] text-right font-semibold ${BRAND_INK}`}>{value}</span>
    </div>
  )
}

type LoanApplicationDetailsScreenProps = {
  application: StorefrontApplication
  product?: MobileProduct | null
  providerName?: string
  backHref?: string
}

export function LoanApplicationDetailsScreen({
  application,
  product,
  providerName,
  backHref = "/mobile-v2/products/loan/pending",
}: LoanApplicationDetailsScreenProps) {
  const router = useRouter()
  const details = buildLoanApplicationDetails(application, { product, providerName })
  const showWorkflowStatus =
    Boolean(application.loanWorkflowStatus) &&
    details.workflowStatus.toLowerCase() !== details.status.toLowerCase()

  const rows: Array<{ label: string; value: string }> = [
    { label: "Status", value: details.status },
    ...(showWorkflowStatus
      ? [{ label: "Workflow status", value: details.workflowStatus }]
      : []),
    { label: "Disbursement Date", value: details.disbursementDate },
    { label: "Loan Amount", value: details.loanAmount },
    { label: "Loan ID", value: details.loanId },
    { label: "Automation", value: details.automation },
    { label: "Interest", value: details.interest },
    { label: "Total to be repaid", value: details.totalToRepay },
    { label: "Bank Name", value: details.bankName },
    { label: "Powered by", value: details.poweredBy },
  ]

  return (
    <div className="flex h-full flex-col sf-page-bg-tint">
      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-12 no-scrollbar">
        <div className="rounded-lg bg-white px-4 pb-6 pt-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200" />

          <h1 className={`mb-3 text-center text-base font-semibold ${BRAND_INK}`}>{details.title}</h1>
          <div className="mb-6 flex justify-center">
            <span className="rounded-full bg-[color-mix(in_srgb,var(--sf-button,#1E40AF)_12%,white)] px-3 py-1 text-[11px] font-semibold text-[var(--sf-button,#1E40AF)]">
              {details.status}
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          <Button
            type="button"
            onClick={() => router.push(backHref)}
            className="mt-8 h-12 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
          >
            Go back
          </Button>

          <Link
            href={backHref}
            className="mt-3 block text-center text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Back to my loans
          </Link>
        </div>
      </div>
    </div>
  )
}
