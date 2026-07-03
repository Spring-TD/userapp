'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Loader2,
    Plus,
    Wallet,
} from 'lucide-react';
import {
    WalletAccountRowSkeleton,
    WalletBalanceCardSkeleton,
} from '@/components/mobile-v2/data-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { fetchUserProductApplications } from '@/lib/services/productApplicationApi';
import { fetchUserProductTypeSummary } from '@/lib/services/userWalletApi';
import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient';
import {
    aggregateCommodityHoldingBalance,
    canWithdrawCommodity,
    withdrawCommodity,
} from '@/lib/commodityApi';
import { formatWalletBalance } from '@/lib/userWallet';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { MobileV2NotificationBell } from '@/components/mobile-v2/MobileV2NotificationBell';
import type { ProductApplication } from '@/types/productApplication';
import type { ProductTypeSummaryItem, UserProductTypeSummary, WalletProductType } from '@/types/userWallet';

type CommodityContractSnapshot = {
    commodityPrincipal?: number;
    commodityHoldingStatus?: string;
    maturityAt?: string;
    expectedInterest?: number;
    totalAtMaturity?: number;
    fundedAt?: string;
};

const ACCOUNT_FILTERS = ['Mortgage', 'Loan', 'Savings', 'Invest', 'Commodity'] as const;
type AccountFilter = typeof ACCOUNT_FILTERS[number];
const ACCOUNT_TOTAL_LABELS: Record<AccountFilter, string> = {
    Mortgage: 'Total Mortgage',
    Loan: 'Total Loan',
    Savings: 'Total Savings',
    Invest: 'Total Investment',
    Commodity: 'Total Commodity',
};
const ACCOUNT_FILTER_TO_PRODUCT_TYPE: Record<AccountFilter, WalletProductType> = {
    Mortgage: 'MORTGAGE',
    Loan: 'LOAN',
    Savings: 'SAVINGS',
    Invest: 'INVESTMENT',
    Commodity: 'COMMODITY',
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

function productRoute(activeFilter: AccountFilter): string {
    return `/mobile-v2/products/${activeFilter.toLowerCase()}`;
}

function EmptyAccountState({ activeFilter }: { activeFilter: AccountFilter }) {
    const createAccountHref = productRoute(activeFilter);

    return (
        <div className="rounded-[28px] border border-dashed border-blue-200 bg-white px-5 py-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sf-tint,#E0E7FF)] text-[var(--sf-primary,#2563EB)]">
                <Wallet className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-[var(--sf-ink,#1E1B4B)]">
                No {activeFilter.toLowerCase()} account yet
            </h3>
            <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-gray-500">
                Apply for a {activeFilter.toLowerCase()} product to create your account and start tracking it here.
            </p>
            <Link
                href={createAccountHref}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sf-button,#1E40AF)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/10"
            >
                <Plus className="h-4 w-4" />
                Create Account
            </Link>
        </div>
    );
}

function formatMaturityLabel(value?: string | null) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return value;
    }
}

function commoditySnapshot(application: ProductApplication): CommodityContractSnapshot | null {
    const snapshot = (application as { contractSnapshot?: CommodityContractSnapshot }).contractSnapshot;
    return snapshot && typeof snapshot === 'object' ? snapshot : null;
}

function ProductAccountCard({
    application,
    activeFilter,
    userId,
    onWithdrawComplete,
}: {
    application: ProductApplication;
    activeFilter: AccountFilter;
    userId?: string;
    onWithdrawComplete?: () => void;
}) {
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const account = application.productWallet?.upstreamAccount;
    const accountDetailsHref = productRoute(activeFilter);
    const snapshot = activeFilter === 'Commodity' ? commoditySnapshot(application) : null;
    const holdingStatus = snapshot?.commodityHoldingStatus || application.status;
    const provisionStatus = account?.provisionStatus || application.loanWorkflowStatus || holdingStatus || application.status;
    const principal = snapshot?.commodityPrincipal ?? (application as { amount?: number }).amount;
    const withdrawable = Boolean(
        activeFilter === 'Commodity' &&
        userId &&
        canWithdrawCommodity({
            holdingStatus: snapshot?.commodityHoldingStatus,
            status: application.status,
            maturityAt: snapshot?.maturityAt,
        }),
    );

    const handleWithdraw = async (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        if (!userId || !application.id || withdrawing) return;

        setWithdrawing(true);
        setWithdrawError(null);
        const result = await withdrawCommodity(application.id, userId);
        setWithdrawing(false);
        if (!result.ok) {
            setWithdrawError(result.error);
            return;
        }
        onWithdrawComplete?.();
    };

    const content = (
        <div className="w-full rounded-[24px] border sf-border-brand sf-accent-soft p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sf-primary,#2563EB)]">
                        {application.productType || activeFilter}
                    </p>
                    <h3 className="mt-1 truncate text-base font-bold text-[var(--sf-ink,#1E1B4B)]">
                        {application.productName || application.productType || activeFilter}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[var(--sf-ink,#1E1B4B)]">
                        {activeFilter === 'Commodity'
                            ? 'Commodity holding'
                            : account?.accountNumber || 'Pending provisioning'}
                    </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-green-600">
                    {String(provisionStatus || 'pending').replace(/_/g, ' ')}
                </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
                <p className="min-w-0 truncate text-gray-500">
                    {activeFilter === 'Commodity'
                        ? snapshot?.maturityAt
                            ? `Unlocks ${formatMaturityLabel(snapshot.maturityAt)}`
                            : 'Locked holding'
                        : account?.bankName || application.productName || 'Product account'}
                </p>
                <div className="shrink-0 text-right text-xs">
                    <p className="text-gray-400">Application</p>
                    <p className="font-semibold text-[#1E293B]">{application.status || 'PENDING'}</p>
                </div>
            </div>
            {principal != null ? (
                <p className="mt-3 text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">
                    {formatWalletBalance(principal)}
                    {snapshot?.totalAtMaturity != null ? (
                        <span className="ml-2 text-xs font-medium text-gray-500">
                            → {formatWalletBalance(snapshot.totalAtMaturity)} at maturity
                        </span>
                    ) : null}
                </p>
            ) : null}
            {withdrawable ? (
                <div className="mt-4" onClick={(event) => event.preventDefault()}>
                    <Button
                        type="button"
                        disabled={withdrawing}
                        onClick={(event) => void handleWithdraw(event)}
                        className="h-10 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
                    >
                        {withdrawing ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Withdrawing...
                            </span>
                        ) : (
                            'Withdraw principal + interest'
                        )}
                    </Button>
                    {withdrawError ? (
                        <p className="mt-2 text-center text-xs text-red-600">{withdrawError}</p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );

    if (activeFilter === 'Commodity' && withdrawable) {
        return <div className="block">{content}</div>;
    }

    return (
        <Link
            href={accountDetailsHref}
            aria-label={`Open ${activeFilter.toLowerCase()} details`}
            className="block"
        >
            {content}
        </Link>
    );
}

export default function AccountsPage() {
    const [profile, setProfile] = useState<AuthUserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<AccountFilter>('Mortgage');
    const { appId } = useMobileV2Tenant();
    const { wallet, loading: walletLoading, error: walletError, refetch: refetchWallet } = useUserWallet();
    const [productSummary, setProductSummary] = useState<UserProductTypeSummary | null>(null);
    const [applications, setApplications] = useState<ProductApplication[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsError, setApplicationsError] = useState<string | null>(null);
    const activeProductType = ACCOUNT_FILTER_TO_PRODUCT_TYPE[activeFilter];

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

    useEffect(() => {
        const userId = wallet?.userId;
        if (!userId) {
            setProductSummary(null);
            return;
        }

        let cancelled = false;
        setSummaryLoading(true);
        setSummaryError(null);

        void fetchUserProductTypeSummary(userId).then((result) => {
            if (cancelled) return;
            setProductSummary(result.summary);
            setSummaryError(result.error);
            setSummaryLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [wallet?.userId]);

    useEffect(() => {
        const userId = wallet?.userId;
        if (!userId) {
            setApplications([]);
            return;
        }

        let cancelled = false;
        setApplications([]);
        setApplicationsLoading(true);
        setApplicationsError(null);

        const params =
            activeProductType === 'COMMODITY' && appId
                ? { productType: activeProductType, appId }
                : { productType: activeProductType };

        void fetchUserProductApplications(userId, params).then((result) => {
            if (cancelled) return;
            setApplications(result.applications);
            setApplicationsError(result.error);
            setApplicationsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [wallet?.userId, activeProductType, appId]);

    const reloadApplications = useCallback(() => {
        const userId = wallet?.userId;
        if (!userId) return;
        const params =
            activeProductType === 'COMMODITY' && appId
                ? { productType: activeProductType, appId }
                : { productType: activeProductType };
        void fetchUserProductApplications(userId, params).then((result) => {
            setApplications(result.applications);
            setApplicationsError(result.error);
        });
        void refetchWallet();
    }, [wallet?.userId, activeProductType, appId, refetchWallet]);

    const displayName = useMemo(() => displayNameFromProfile(profile), [profile]);
    const totalLabel = ACCOUNT_TOTAL_LABELS[activeFilter];
    const activeSummary: ProductTypeSummaryItem = productSummary?.summary?.[activeProductType] ?? {
        totalAmount: 0,
        currency: productSummary?.currency || wallet?.currency || 'NGN',
        accountCount: 0,
        accounts: [],
    };
    const activeApplications = applications.filter(
        (application) => String(application.productType || '').toUpperCase() === activeProductType,
    );
    const commodityHoldingTotal =
        activeFilter === 'Commodity'
            ? aggregateCommodityHoldingBalance(activeApplications)
            : 0;
    const createdAccountCount = activeApplications.length;
    const displayedAccountCount = Math.max(activeSummary.accountCount, createdAccountCount);
    const activeTotalAmount =
        activeFilter === 'Commodity' ? commodityHoldingTotal : activeSummary.totalAmount;
    const activeFormattedBalance = formatWalletBalance(
        activeTotalAmount,
        activeSummary.currency || wallet?.currency || 'NGN',
    );
    const isSummaryBusy = walletLoading || summaryLoading || applicationsLoading;

    return (
        <div className="flex min-h-full flex-col sf-page-bg relative">
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
                    <MobileV2NotificationBell />
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
                    {isSummaryBusy && !productSummary ? (
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
                                    {isSummaryBusy ? (
                                        <Skeleton className="h-10 w-40 rounded-lg bg-white/25" />
                                    ) : walletError || summaryError ? (
                                        <span className="text-lg font-semibold text-blue-100">—</span>
                                    ) : (
                                        activeFormattedBalance
                                    )}
                                </h2>
                                <p className="text-[11px] text-blue-200/90 text-center max-w-[280px]">
                                    {walletError || summaryError || applicationsError || `Your ${activeFilter.toLowerCase()} account total`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 flex justify-between items-center mb-4">
                    <h2 className="font-bold text-[#1E293B]">{activeFilter} Accounts</h2>
                    {isSummaryBusy ? (
                        <Skeleton className="h-4 w-16 rounded-md bg-gray-200/90" />
                    ) : (
                        <span className="text-xs text-green-500 font-medium">
                            {displayedAccountCount} Active
                        </span>
                    )}
                </div>

                <div className="px-6 space-y-6">
                    {applicationsLoading || (isSummaryBusy && !productSummary && applications.length === 0) ? (
                        <WalletAccountRowSkeleton />
                    ) : activeApplications.length > 0 ? (
                        activeApplications.map((application) => (
                            <ProductAccountCard
                                key={application.id}
                                application={application}
                                activeFilter={activeFilter}
                                userId={wallet?.userId}
                                onWithdrawComplete={reloadApplications}
                            />
                        ))
                    ) : (
                        walletError || summaryError || applicationsError ? (
                            <p className="text-sm text-gray-500 px-2">
                                {walletError || summaryError || applicationsError}
                            </p>
                        ) : (
                            <EmptyAccountState activeFilter={activeFilter} />
                        )
                    )}

                </div>
            </div>

            <MobileV2BottomNav active="account" />
        </div>
    );
}
