'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, PiggyBank } from 'lucide-react'
import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
import { Button } from '@/components/ui/button'
import { mortgageApplyStartHref } from '@/lib/mortgageApplyRoutes'
import {
  formatSavingsDuration,
  formatSavingsMoney,
  listMortgageSavingsApplications,
  statusLabelForSavings,
  type MortgageSavingsApplication,
} from '@/lib/mortgageDownPaymentSavings'
import { cn } from '@/lib/utils'

function statusTone(status: MortgageSavingsApplication['status']): string {
  switch (status) {
    case 'running':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700'
    case 'declined':
      return 'bg-red-100 text-red-700'
    default:
      return 'sf-accent-soft sf-text-button'
  }
}

export default function MortgagePendingSavingsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<MortgageSavingsApplication[]>([])

  useEffect(() => {
    setRows(listMortgageSavingsApplications())
  }, [])

  return (
    <MobileFlowShell title="Pending Savings" onBack={() => router.push('/mobile-v2/products/mortgage')}>
      <p className="mb-5 text-sm text-gray-500">
        Track down payment Target Savings requests. Once your FI approves a plan, you can open it and start
        funding toward your goal.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-button,#1E40AF)]">
            <PiggyBank className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">No savings applications yet</p>
          <p className="mt-1 text-xs text-gray-500">
            Start from a mortgage application when a down payment is required.
          </p>
          <Link href="/mobile-v2/products/mortgage" className="mt-4 inline-block">
            <Button className="h-10 rounded-full bg-[var(--sf-button,#1E40AF)] px-5 text-sm font-semibold text-white">
              Browse mortgages
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const canOpenProduct = row.status === 'running' || row.status === 'approved'
            const productHref = row.savingsProductId
              ? `/mobile-v2/products/savings/target-savings/${encodeURIComponent(row.savingsProductId)}`
              : '/mobile-v2/products/savings/target-savings'
            return (
              <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">
                      {row.propertyName}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{row.productName}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                      statusTone(row.status),
                    )}
                  >
                    {statusLabelForSavings(row.status)}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  <p>
                    Goal{' '}
                    <span className="font-semibold text-[var(--sf-ink,#1E1B4B)]">
                      {formatSavingsMoney(row.goalAmount)}
                    </span>
                  </p>
                  <p>
                    {formatSavingsMoney(row.monthly)} / month · {formatSavingsDuration(row.months)} ·{' '}
                    {(row.annualRate * 100).toFixed(0)}% p.a.
                  </p>
                  <p>
                    Requested{' '}
                    {new Date(row.requestedAt).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {canOpenProduct ? (
                    <Link href={productHref}>
                      <Button className="h-10 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white">
                        View savings product
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <p className="rounded-xl bg-[var(--sf-tint,#E0E7FF)] px-3 py-2 text-center text-[11px] text-[var(--sf-button,#1E40AF)]">
                      Waiting for FI approval on Plata. You&apos;ll be able to open the exact savings
                      product once it&apos;s created.
                    </p>
                  )}
                  <Link href={mortgageApplyStartHref(row.productId)}>
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-full border-gray-200 text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]"
                    >
                      Continue mortgage application
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </MobileFlowShell>
  )
}
