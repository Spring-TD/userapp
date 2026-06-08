'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Bell,
    Eye,
    Wallet,
} from 'lucide-react';
import {
    WalletAccountRowSkeleton,
    WalletBalanceCardSkeleton,
} from '@/components/mobile-v2/data-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserWallet } from '@/hooks/useUserWallet';
import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient';
import { maskAccountNumber } from '@/lib/userWallet';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';

const ACCOUNT_FILTERS = ['Mortgage', 'Loan', 'Savings', 'Invest', 'Commodity'] as const;
type AccountFilter = typeof ACCOUNT_FILTERS[number];
const ACCOUNT_LOGO_SRC = '/images/mobile/WhatsApp%20Image%202026-05-20%20at%201.34.41%20PM.jpeg';
const ACCOUNT_TOTAL_LABELS: Record<AccountFilter, string> = {
    Mortgage: 'Total Mortgage',
    Loan: 'Total Loan',
    Savings: 'Total Savings',
    Invest: 'Total Investment',
    Commodity: 'Total Commodity',
};

function displayNameFromProfile(user: AuthUserProfile | null): string {
    if (!user) return '';
    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return '';
}

function ProductAccountCard({
    activeFilter,
    walletLabel,
    formattedBalance,
    statusLabel,
    currency,
    masked,
}: {
    activeFilter: AccountFilter;
    walletLabel: string;
    formattedBalance: string;
    statusLabel: string;
    currency?: string;
    masked: string;
}) {
    const showMortgageImage = activeFilter === 'Mortgage';
    const accountDetailsHref =
        activeFilter === 'Mortgage'
            ? '/mobile-v2/products/mortgage'
            : activeFilter === 'Loan'
              ? '/mobile-v2/products/loan'
              : null;

    const card = (
        <div className="w-full bg-[#EFF6FF] rounded-[24px] p-6 relative overflow-hidden min-h-[156px]">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="mb-4 h-9 w-[118px] overflow-hidden rounded-md bg-white/70">
                        <Image
                            src={ACCOUNT_LOGO_SRC}
                            alt="AG Mortgage Bank"
                            width={118}
                            height={40}
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <p className="text-sm text-[#1E293B] mb-1 font-medium">{walletLabel}</p>
                    <h3 className="text-2xl font-bold text-[var(--sf-ink,#1E1B4B)]">
                        {formattedBalance}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{statusLabel} · {currency || 'NGN'}</p>
                </div>

                {showMortgageImage ? (
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm">
                        <Image
                            src="/mortgage-feature.png"
                            alt="Mortgage product"
                            fill
                            sizes="96px"
                            className="object-cover"
                        />
                    </div>
                ) : null}
            </div>

            {/* <div className="absolute bottom-6 right-6 flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium tracking-wider">{masked}</span>
                <Eye className="w-4 h-4 text-gray-400" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
            </div> */}
        </div>
    );

    if (!accountDetailsHref) return card;

    return (
        <Link href={accountDetailsHref} aria-label={`Open ${activeFilter.toLowerCase()} details`}>
            {card}
        </Link>
    );
}

export default function AccountsPage() {
    const [profile, setProfile] = useState<AuthUserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<AccountFilter>('Mortgage');
    const { wallet, formattedBalance, loading: walletLoading, error: walletError } = useUserWallet();

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const { user } = await fetchAuthUserProfile();
            if (!cancelled) {
                setProfile(user);
                setProfileLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const displayName = useMemo(() => displayNameFromProfile(profile), [profile]);
    const walletLabel = wallet?.name || 'Main Wallet';
    const masked = maskAccountNumber(wallet?.virtualNuban?.accountNumber);
    const statusLabel =
        wallet?.status === 'ACTIVE' ? 'Active' : wallet?.status ? wallet.status : '—';
    const totalLabel = ACCOUNT_TOTAL_LABELS[activeFilter];

    return (
        <div className="flex min-h-full flex-col bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-[calc(8rem+env(safe-area-inset-bottom))]">
                <div className="px-6 pt-12 pb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-[19px] font-bold text-[#1E293B]">
                            Hello{' '}
                            {profileLoading ? (
                                <Skeleton className="inline-block h-[1.15em] w-24 rounded-md bg-gray-200/90 align-middle" />
                            ) : displayName ? (
                                <span className="text-[var(--sf-ink,#1E1B4B)]">{displayName}</span>
                            ) : null}
                        </h1>
                        <p className="text-gray-500 text-[13px] min-h-[1.25rem]">
                            {profileLoading ? (
                                <Skeleton className="mt-0.5 h-4 w-52 rounded-md bg-gray-200/90" />
                            ) : (
                                'Your finances are looking good'
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-[var(--sf-tint,#E0E7FF)] flex items-center justify-center text-[var(--sf-primary,#2563EB)]"
                        aria-label="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 mb-6">
                    <div className="w-full bg-[#F3F4F6] p-1.5 rounded-full flex items-center justify-between overflow-x-auto no-scrollbar">
                        {ACCOUNT_FILTERS.map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setActiveFilter(filter)}
                                className={`flex-1 text-center py-2.5 px-4 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                                    filter === activeFilter
                                        ? 'bg-white text-[var(--sf-button,#1E40AF)] shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 bg-transparent'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 mb-8">
                    {walletLoading && !wallet ? (
                        <WalletBalanceCardSkeleton />
                    ) : (
                        <div className="relative isolate w-full h-[220px] rounded-[30px] overflow-hidden bg-[var(--sf-button,#1E40AF)] shadow-xl shadow-blue-900/10">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
                            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4 px-4">
                                <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white/90" />
                                </div>
                                <span className="text-sm font-medium text-blue-100 mb-1">{totalLabel}</span>
                                <h2 className="text-4xl font-bold mb-2 min-h-[2.5rem] flex items-center justify-center">
                                    {walletLoading ? (
                                        <Skeleton className="h-10 w-40 rounded-lg bg-white/25" />
                                    ) : walletError ? (
                                        <span className="text-lg font-semibold text-blue-100">—</span>
                                    ) : (
                                        formattedBalance
                                    )}
                                </h2>
                                <p className="text-[11px] text-blue-200/90 text-center max-w-[280px]">
                                    {walletError || `Your ${activeFilter.toLowerCase()} account total`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 flex justify-between items-center mb-4">
                    <h2 className="font-bold text-[#1E293B]">{activeFilter} Accounts</h2>
                    {walletLoading ? (
                        <Skeleton className="h-4 w-16 rounded-md bg-gray-200/90" />
                    ) : (
                        <span className="text-xs text-green-500 font-medium">
                            {wallet ? '1 Active' : '0 Active'}
                        </span>
                    )}
                </div>

                <div className="px-6 space-y-4">
                    {walletLoading && !wallet ? (
                        <WalletAccountRowSkeleton />
                    ) : wallet ? (
                        <ProductAccountCard
                            activeFilter={activeFilter}
                            walletLabel={walletLabel}
                            formattedBalance={formattedBalance}
                            statusLabel={statusLabel}
                            currency={wallet.currency}
                            masked={masked}
                        />
                    ) : (
                        <p className="text-sm text-gray-500 px-2">
                            {walletError || `No active ${activeFilter.toLowerCase()} account yet.`}
                        </p>
                    )}

                </div>
            </div>

            <MobileV2BottomNav active="account" />
        </div>
    );
}
