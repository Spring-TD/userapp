'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { useUserWallet } from '@/hooks/useUserWallet'
import { fetchUserProductApplications } from '@/lib/services/productApplicationApi'
import { fetchUserWalletTransactions } from '@/lib/services/userWalletApi'
import { walletTransactionToReceipt } from '@/lib/transactionReceipt'
import { formatWalletBalance, walletTransactionMethodLabel, walletTransactionTitle } from '@/lib/userWallet'
import type { ProductApplication } from '@/types/productApplication'
import type { WalletTransaction } from '@/types/userWallet'
import { TransactionReceiptSheet } from '@/components/mobile-v2/transactions/TransactionReceiptSheet'
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile'

const ORDER_ACTIVITY_TABS = [
  'All',
  'Loan',
  'Mortgage',
  'Savings',
  'Investment',
  'Commodity',
  'Wallet',
] as const

type OrderActivityTab = (typeof ORDER_ACTIVITY_TABS)[number]

function tabMatchesTransaction(tab: OrderActivityTab, transaction: WalletTransaction, applications: ProductApplication[]): boolean {
  if (tab === 'All') return true
  if (tab === 'Wallet') {
    const haystack = [
      transaction.category,
      transaction.source,
      transaction.description,
      ...(transaction.tags || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return !/(loan|mortgage|savings|invest|commodity)/i.test(haystack)
  }

  const productType = tab.toUpperCase()
  const haystack = [
    transaction.category,
    transaction.source,
    transaction.description,
    transaction.referenceId,
    ...(transaction.tags || []),
    ...applications
      .filter((app) => String(app.productType || '').toUpperCase() === productType)
      .map((app) => app.productName || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(productType.toLowerCase()) || haystack.includes(tab.toLowerCase())
}

function applicationActivityRows(applications: ProductApplication[], tab: OrderActivityTab) {
  return applications
    .filter((application) => {
      if (tab === 'All') return true
      if (tab === 'Wallet') return false
      return String(application.productType || '').toUpperCase() === tab.toUpperCase()
    })
    .map((application) => ({
      id: `app-${application.id}`,
      title: application.productName || `${application.productType} application`,
      subtitle: application.status,
      amount: (application as { amount?: number }).amount,
      createdAt: application.createdAt || application.updatedAt || new Date().toISOString(),
      kind: 'application' as const,
    }))
}

export default function OrdersPage() {
  const router = useRouter()
  const { user: profile } = useAuthUserProfile()
  const { wallet } = useUserWallet()
  const [activeTab, setActiveTab] = useState<OrderActivityTab>('All')
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [applications, setApplications] = useState<ProductApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)

  useEffect(() => {
    const userId = wallet?.userId
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      const [txResult, appResult] = await Promise.all([
        fetchUserWalletTransactions(userId, { limit: 100 }),
        fetchUserProductApplications(userId),
      ])
      if (cancelled) return
      setTransactions(txResult.transactions)
      setApplications(appResult.applications)
      setError(txResult.error || appResult.error)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [wallet?.userId])

  const walletRows = useMemo(
    () =>
      transactions
        .filter((transaction) => tabMatchesTransaction(activeTab, transaction, applications))
        .map((transaction) => ({
          id: transaction.id,
          title: walletTransactionTitle(transaction),
          subtitle: walletTransactionMethodLabel(transaction),
          amount: transaction.amount,
          createdAt: transaction.createdAt,
          kind: 'wallet' as const,
          transaction,
        })),
    [transactions, applications, activeTab],
  )

  const appRows = useMemo(() => applicationActivityRows(applications, activeTab), [applications, activeTab])

  const rows = useMemo(
    () =>
      [...walletRows, ...appRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [walletRows, appRows],
  )

  const selectedReceipt = selectedTransaction
    ? walletTransactionToReceipt(selectedTransaction, {
        accountHolder: wallet?.name,
        currency: wallet?.currency,
      })
    : null

  return (
    <div className="relative min-h-full bg-[#F5F6FB] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <header className="flex h-[102px] items-end justify-between bg-[#F4F6FF] px-7 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#111827] shadow-sm"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="pb-1 text-[15px] font-semibold text-[#111827]">All activities</h1>
        <div className="h-8 w-8" />
      </header>

      <main className="-mt-1 rounded-t-[8px] bg-white px-4 pb-8 pt-4">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#E5E7EB]" />

        <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
          {ORDER_ACTIVITY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                activeTab === tab
                  ? 'bg-[#111827] text-white'
                  : 'bg-[#F3F4F6] text-[#6B7280]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl bg-gray-200/90" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#6B7280]">{error}</div>
        ) : rows.length > 0 ? (
          <div className="space-y-3">
            {rows.map((row) =>
              row.kind === 'wallet' ? (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedTransaction(row.transaction)}
                  className="flex w-full items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{row.title}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">{row.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#111827]">
                      {row.amount != null ? formatWalletBalance(row.amount, wallet?.currency) : '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-[#9CA3AF]">
                      {new Date(row.createdAt).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                </button>
              ) : (
                <Link
                  key={row.id}
                  href={`/mobile-v2/accounts/${row.id.replace('app-', '')}`}
                  className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] px-4 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{row.title}</p>
                    <p className="mt-1 text-xs text-[#9CA3AF]">{row.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#111827]">
                      {row.amount != null ? formatWalletBalance(row.amount, wallet?.currency) : 'Application'}
                    </p>
                    <p className="mt-1 text-[10px] text-[#9CA3AF]">
                      {new Date(row.createdAt).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-[#F8FAFC] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[#111827]">No activities yet</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Orders and product transactions will appear here.</p>
          </div>
        )}
      </main>

      {selectedReceipt ? (
        <TransactionReceiptSheet
          receipt={selectedReceipt}
          userEmail={profile?.email}
          onClose={() => setSelectedTransaction(null)}
        />
      ) : null}
    </div>
  )
}
