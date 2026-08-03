'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { MobileFlowShell } from '@/components/mobile-v2/MobileFlowShell'
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
  const { user: profile } = useAuthUserProfile()
  const { wallet, loading: walletLoading } = useUserWallet()
  const [activeTab, setActiveTab] = useState<OrderActivityTab>('All')
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [applications, setApplications] = useState<ProductApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)

  useEffect(() => {
    const userId = wallet?.userId
    if (walletLoading) {
      setLoading(true)
      return
    }
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
  }, [wallet?.userId, walletLoading])

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
    <MobileFlowShell title="All records">
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />

      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        {ORDER_ACTIVITY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
              activeTab === tab
                ? 'sf-btn text-white'
                : 'sf-accent-soft sf-text-ink'
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
        <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center text-sm text-gray-500">{error}</div>
      ) : rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) =>
            row.kind === 'wallet' ? (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedTransaction(row.transaction)}
                className="sf-accent-soft flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left"
              >
                <div>
                  <p className="text-sm font-semibold sf-text-ink">{row.title}</p>
                  <p className="mt-1 text-xs text-gray-400">{row.subtitle}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      typeof row.amount === 'number' && row.amount < 0
                        ? 'text-red-600'
                        : 'sf-text-ink'
                    }`}
                  >
                    {row.amount != null ? formatWalletBalance(row.amount, wallet?.currency) : '—'}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(row.createdAt).toLocaleDateString('en-NG')}
                  </p>
                </div>
              </button>
            ) : (
              <Link
                key={row.id}
                href={`/mobile-v2/accounts/${row.id.replace('app-', '')}`}
                className="sf-accent-soft flex items-center justify-between rounded-2xl px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold sf-text-ink">{row.title}</p>
                  <p className="mt-1 text-xs text-gray-400">{row.subtitle}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      typeof row.amount === 'number' && row.amount < 0
                        ? 'text-red-600'
                        : 'sf-text-ink'
                    }`}
                  >
                    {row.amount != null ? formatWalletBalance(row.amount, wallet?.currency) : 'Application'}
                  </p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(row.createdAt).toLocaleDateString('en-NG')}
                  </p>
                </div>
              </Link>
            ),
          )}
        </div>
      ) : (
        <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center">
          <p className="text-sm font-semibold sf-text-ink">No records yet</p>
          <p className="mt-1 text-xs text-gray-400">Product applications and transactions will appear here.</p>
        </div>
      )}

      {selectedReceipt ? (
        <TransactionReceiptSheet
          receipt={selectedReceipt}
          userEmail={profile?.email}
          onClose={() => setSelectedTransaction(null)}
        />
      ) : null}
    </MobileFlowShell>
  )
}
