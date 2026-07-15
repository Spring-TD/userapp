'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, SlidersHorizontal } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile';
import { useUserWallet } from '@/hooks/useUserWallet';
import { fetchUserWalletTransactions } from '@/lib/services/userWalletApi';
import { walletTransactionToReceipt } from '@/lib/transactionReceipt';
import { formatWalletBalance, walletTransactionMethodLabel, walletTransactionTitle } from '@/lib/userWallet';
import type { WalletTransaction } from '@/types/userWallet';
import { TransactionReceiptSheet } from '@/components/mobile-v2/transactions/TransactionReceiptSheet';
import {
    DEFAULT_TRANSACTION_FILTERS,
    TransactionFilterSheet,
    type TransactionFilters,
} from '@/components/mobile-v2/transactions/TransactionFilterSheet';

function formatTransactionTime(value?: string): string {
    if (!value) return '12:00 pm';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '12:00 pm';
    return date.toLocaleTimeString('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).toLowerCase();
}

function TransactionRow({
    transaction,
    onSelect,
}: {
    transaction: WalletTransaction;
    onSelect: (transaction: WalletTransaction) => void;
}) {
    const isCredit = transaction.type === 'CREDIT';

    return (
        <button
            type="button"
            onClick={() => onSelect(transaction)}
            className="flex min-h-[66px] w-full items-center justify-between rounded-xl bg-white px-3.5 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.03)]"
        >
            <div className="min-w-0">
                <p className="mb-1.5 text-[9px] font-medium text-gray-400">{walletTransactionMethodLabel(transaction)}</p>
                <h2 className="truncate text-[13px] font-semibold sf-text-ink">{walletTransactionTitle(transaction)}</h2>
            </div>
            <div className="shrink-0 text-right">
                <p className={`text-[11px] font-semibold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatWalletBalance(transaction.amount)}
                </p>
                <p className="mt-1.5 text-[9px] font-medium text-gray-400">{formatTransactionTime(transaction.createdAt)}</p>
            </div>
        </button>
    );
}

function TransactionListSkeleton() {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="rounded-xl bg-white px-3.5 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="mb-2 h-2.5 w-12 rounded-full bg-gray-200/90" />
                            <Skeleton className="h-4 w-28 rounded-full bg-gray-200/90" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-3 w-16 rounded-full bg-gray-200/90" />
                            <Skeleton className="h-2.5 w-12 rounded-full bg-gray-200/90" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TransactionsPage() {
    const router = useRouter();
    const { user: profile } = useAuthUserProfile();
    const { wallet, loading: walletLoading, error: walletError } = useUserWallet();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
    const [draftFilters, setDraftFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

    const loadTransactions = useCallback(async () => {
        const userId = wallet?.userId;
        if (!userId) return;

        setLoading(true);
        setError(null);

        const result = await fetchUserWalletTransactions(userId, {
            limit: 100,
            ...(filters.type ? { type: filters.type } : {}),
            ...(filters.startDate ? { startDate: filters.startDate } : {}),
            ...(filters.endDate ? { endDate: filters.endDate } : {}),
        });

        setTransactions(result.transactions);
        setError(result.error);
        setLoading(false);
    }, [wallet?.userId, filters]);

    useEffect(() => {
        void loadTransactions();
    }, [loadTransactions]);

    const visibleTransactions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = query
            ? transactions.filter((transaction) => {
                const haystack = [
                    walletTransactionMethodLabel(transaction),
                    walletTransactionTitle(transaction),
                    transaction.amount,
                    transaction.type,
                    transaction.status,
                    transaction.description,
                    transaction.referenceId,
                    formatTransactionTime(transaction.createdAt),
                ]
                    .filter((value) => value !== undefined && value !== null)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            })
            : transactions;

        return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [transactions, searchQuery]);

    const selectedReceipt = selectedTransaction
        ? walletTransactionToReceipt(selectedTransaction, {
              accountHolder: wallet?.name,
              currency: wallet?.currency,
          })
        : null;

    const isLoading = walletLoading || loading;
    const activeFilterCount = Number(Boolean(filters.type)) + Number(Boolean(filters.startDate)) + Number(Boolean(filters.endDate));

    return (
        <div className="relative min-h-full sf-page-bg pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <header className="flex h-[102px] items-end justify-between sf-page-bg-tint px-7 pb-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 sf-text-ink shadow-sm"
                    aria-label="Go back"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="pb-1 text-[15px] font-semibold sf-text-ink">Transactions</h1>
                <button
                    type="button"
                    onClick={() => {
                        setDraftFilters(filters);
                        setShowFilters(true);
                    }}
                    className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/70 sf-text-ink shadow-sm"
                    aria-label="Filter transactions"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full sf-bg-button text-[9px] font-bold text-white">
                            {activeFilterCount}
                        </span>
                    ) : null}
                </button>
            </header>

            <main className="-mt-1 rounded-t-[8px] bg-white px-6 pb-8 pt-4 shadow-[0_-4px_20px_rgba(15,23,42,0.02)]">
                <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200" />

                <label className="mb-5 flex h-[43px] items-center gap-3 rounded-[22px] border sf-border-subtle sf-page-bg-tint px-4">
                    <Search className="h-4 w-4 sf-text-primary" />
                    <input
                        type="search"
                        placeholder="Search transactions"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-full min-w-0 flex-1 bg-transparent text-[12px] sf-text-ink outline-none placeholder:text-gray-400"
                    />
                </label>

                {activeFilterCount > 0 ? (
                    <p className="mb-4 text-xs text-gray-500">
                        Showing filtered results
                        {filters.type ? ` · ${filters.type.toLowerCase()}` : ''}
                        {filters.startDate ? ` · from ${filters.startDate}` : ''}
                        {filters.endDate ? ` · to ${filters.endDate}` : ''}
                    </p>
                ) : null}

                {isLoading ? (
                    <TransactionListSkeleton />
                ) : error || walletError ? (
                    <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center">
                        <p className="text-sm font-semibold sf-text-ink">Transactions unavailable</p>
                        <p className="mt-1 text-xs text-gray-400">{error || walletError}</p>
                    </div>
                ) : visibleTransactions.length > 0 ? (
                    <div className="space-y-2.5">
                        {visibleTransactions.map((transaction) => (
                            <TransactionRow
                                key={transaction.id}
                                transaction={transaction}
                                onSelect={setSelectedTransaction}
                            />
                        ))}
                    </div>
                ) : searchQuery.trim() || activeFilterCount > 0 ? (
                    <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center">
                        <p className="text-sm font-semibold sf-text-ink">No matching transactions</p>
                        <p className="mt-1 text-xs text-gray-400">Try another search or adjust your filters.</p>
                    </div>
                ) : (
                    <div className="sf-accent-soft rounded-2xl px-4 py-8 text-center">
                        <p className="text-sm font-semibold sf-text-ink">No transactions yet</p>
                        <p className="mt-1 text-xs text-gray-400">Your wallet activity will appear here.</p>
                    </div>
                )}
            </main>

            {showFilters ? (
                <TransactionFilterSheet
                    filters={draftFilters}
                    onChange={setDraftFilters}
                    onApply={() => {
                        setFilters(draftFilters);
                        setShowFilters(false);
                    }}
                    onReset={() => {
                        setDraftFilters(DEFAULT_TRANSACTION_FILTERS);
                        setFilters(DEFAULT_TRANSACTION_FILTERS);
                        setShowFilters(false);
                    }}
                    onClose={() => setShowFilters(false)}
                />
            ) : null}

            {selectedReceipt ? (
                <TransactionReceiptSheet
                    receipt={selectedReceipt}
                    userEmail={profile?.email}
                    onClose={() => setSelectedTransaction(null)}
                />
            ) : null}
        </div>
    );
}
