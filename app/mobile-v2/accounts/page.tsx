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
import { TransferToPrimaryDrawer } from '@/components/mobile-v2/TransferToPrimaryDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import {
    fetchApprovedAmountSummary,
    fetchUserProductApplications,
    type ApprovedAmountBucket,
    type ApprovedAmountSummary,
    type ApprovedProductType,
} from '@/lib/services/productApplicationApi';
import { fetchAuthUserProfile, type AuthUserProfile } from '@/lib/userProfileClient';
import {
    canWithdrawCommodity,
    withdrawCommodity,
} from '@/lib/commodityApi';
import {
    canTransferProductWalletToPrimary,
    productWalletAvailableBalance,
    shouldShowTransferredToPrimary,
    withZeroProductWallet,
} from '@/lib/productWalletTransfer';
import { fetchApplicationById } from '@/lib/storefrontApplicationClient';
import { formatWalletBalance } from '@/lib/userWallet';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { MobileV2NotificationBell } from '@/components/mobile-v2/MobileV2NotificationBell';
import type { ProductApplication } from '@/types/productApplication';
import type { WalletProductType } from '@/types/userWallet';

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
        <div className="rounded-[28px] border border-dashed sf-border-brand bg-white px-5 py-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full sf-icon-tile-bg">
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
                className="sf-btn mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg"
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

function provisionStatusTone(status?: string | null): string {
    const normalized = String(status || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')

    if (
        normalized.includes('account requested') ||
        normalized === 'requested' ||
        normalized.includes('pending') ||
        normalized.includes('under review') ||
        normalized.includes('provision')
    ) {
        return 'bg-orange-100 text-orange-700'
    }

    // Live / operational account
    if (normalized.includes('active')) {
        return 'bg-emerald-600 text-white'
    }

    // Merchant-approved application (not the same stage as Active)
    if (normalized.includes('approved')) {
        return 'bg-[var(--sf-button,#1E40AF)] text-white'
    }

    if (
        normalized.includes('disbursed') ||
        normalized.includes('successful') ||
        normalized.includes('completed')
    ) {
        return 'bg-teal-600 text-white'
    }

    if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('withdraw')) {
        return 'bg-red-100 text-red-700'
    }

    return 'bg-orange-100 text-orange-700'
}

function normalizeStatusToken(status?: string | null): string {
    return String(status || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
}

function isLiveStatusToken(normalized: string): boolean {
    if (!normalized) return false
    return (
        /\bactive\b/.test(normalized) ||
        normalized.includes('disbursed') ||
        normalized.includes('successful') ||
        normalized.includes('completed')
    )
}

function isPendingProvisionToken(normalized: string): boolean {
    if (!normalized) return false
    return (
        normalized.includes('account requested') ||
        normalized === 'requested' ||
        normalized.includes('pending') ||
        normalized.includes('under review') ||
        normalized.includes('provision') ||
        normalized.includes('draft') ||
        normalized.includes('cancelled') ||
        normalized.includes('canceled') ||
        normalized.includes('rejected') ||
        normalized.includes('failed')
    )
}

function applicationUpdatedAt(application: ProductApplication): number {
    const raw =
        (application as { updatedAt?: string }).updatedAt ||
        (application as { createdAt?: string }).createdAt ||
        ''
    const ts = Date.parse(String(raw))
    return Number.isFinite(ts) ? ts : 0
}

/** Approved accounts list: one row per application id, newest first. */
function selectDisplayableProductAccounts(applications: ProductApplication[]): ProductApplication[] {
    return [...applications].sort((a, b) => applicationUpdatedAt(b) - applicationUpdatedAt(a))
}

function emptyAmountBucket(currency = 'NGN'): ApprovedAmountBucket {
    return { totalAmount: 0, applicationCount: 0, currency }
}

function formatApprovedTotal(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true,
        }).format(amount)
    } catch {
        return formatWalletBalance(amount, currency || 'NGN')
    }
}

/**
 * Single user-facing status for Accounts cards.
 * Never pair an "Approved" badge with a "Pending provisioning" subtitle.
 */
/** Spendable balance sitting on the product application wallet (not PRIMARY). */
function canTransferProductToPrimary(
    application: ProductApplication,
    activeFilter: AccountFilter,
): boolean {
    if (activeFilter === 'Commodity') return false
    return canTransferProductWalletToPrimary(application)
}

function getProductAccountDisplayStatus(application: ProductApplication): string {
    const appStatus = normalizeStatusToken(application.status)
    const account = application.productWallet?.upstreamAccount
    const provision = normalizeStatusToken(account?.provisionStatus)
    const workflow = normalizeStatusToken(application.loanWorkflowStatus)
    const snapshot = commoditySnapshot(application)
    const holding = normalizeStatusToken(snapshot?.commodityHoldingStatus)
    const hasAccountNumber = Boolean(account?.accountNumber?.trim())
    const pafStatus = normalizeStatusToken(
        (application as { postApprovalFulfillment?: { status?: string } }).postApprovalFulfillment?.status,
    )
    const scheduleSource = normalizeStatusToken(
        (application as { amortizationSchedule?: { source?: string } }).amortizationSchedule?.source,
    )

    if (appStatus.includes('reject') || appStatus.includes('declin')) return 'Rejected'
    if (appStatus.includes('cancel')) return 'Cancelled'
    if (
        appStatus.includes('disburs') ||
        pafStatus.includes('disburs') ||
        scheduleSource === 'confirmed'
    ) {
        return 'Disbursed'
    }
    if (holding.includes('withdraw')) return 'Withdrawn'

    const provisionLive =
        hasAccountNumber ||
        isLiveStatusToken(provision) ||
        isLiveStatusToken(workflow)

    const provisionPending =
        !hasAccountNumber &&
        (provision.includes('account requested') ||
            provision === 'requested' ||
            workflow.includes('account requested') ||
            workflow === 'requested' ||
            (isPendingProvisionToken(provision) && !provisionLive) ||
            (!provisionLive && !account))

    // Application may already be APPROVED while the product wallet/NUBAN is still provisioning.
    if (provisionPending) {
        return 'Account pending'
    }

    if (appStatus.includes('approv')) return 'Approved'

    // Live product account — application still open/pending means account is ready, not "Pending".
    if (!appStatus || appStatus === 'pending' || appStatus.includes('draft') || appStatus.includes('submitted')) {
        return 'Active'
    }

    // Fallback: show application status cleaned up
    return String(application.status || 'Active').replace(/_/g, ' ')
}

function ProductAccountCard({
    application,
    activeFilter,
    userId,
    currency,
    onWithdrawComplete,
    onTransferSuccess,
}: {
    application: ProductApplication;
    activeFilter: AccountFilter;
    userId?: string;
    currency?: string;
    onWithdrawComplete?: () => void;
    onTransferSuccess?: (applicationId: string) => void;
}) {
    const [withdrawing, setWithdrawing] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [transferOpen, setTransferOpen] = useState(false);
    const account = application.productWallet?.upstreamAccount;
    const accountDetailsHref = `/mobile-v2/accounts/${application.id}`;
    const snapshot = activeFilter === 'Commodity' ? commoditySnapshot(application) : null;
    const statusLabel = getProductAccountDisplayStatus(application);
    const productBalance = productWalletAvailableBalance(application);
    const principal = snapshot?.commodityPrincipal ?? application.amount ?? (productBalance || undefined);
    const withdrawable = Boolean(
        activeFilter === 'Commodity' &&
        userId &&
        canWithdrawCommodity({
            holdingStatus: snapshot?.commodityHoldingStatus,
            status: application.status,
            maturityAt: snapshot?.maturityAt,
        }),
    );
    const transferable = Boolean(userId && canTransferProductToPrimary(application, activeFilter));
    const hasCardAction = withdrawable || transferable;

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
                            : account?.accountNumber?.trim()
                              ? account.accountNumber
                              : statusLabel.toLowerCase().includes('pending')
                                ? 'Pending provisioning'
                                : account?.bankName || application.productName || 'Product account'}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${provisionStatusTone(statusLabel)}`}>
                    {statusLabel}
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
            </div>
            {principal != null ? (
                <p className="mt-3 text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">
                    {formatWalletBalance(principal, currency)}
                    {snapshot?.totalAtMaturity != null ? (
                        <span className="ml-2 text-xs font-medium text-gray-500">
                            → {formatWalletBalance(snapshot.totalAtMaturity, currency)} at maturity
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
            {transferable ? (
                <div className="mt-4" onClick={(event) => event.preventDefault()}>
                    <Button
                        type="button"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setTransferOpen(true);
                        }}
                        className="h-10 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white"
                    >
                        Transfer to primary wallet
                    </Button>
                    {productBalance > 0 ? (
                        <p className="mt-2 text-center text-[11px] text-gray-500">
                            Available: {formatWalletBalance(productBalance, application.currency || currency)}
                        </p>
                    ) : null}
                </div>
            ) : (activeFilter === 'Loan' || activeFilter === 'Mortgage') &&
              shouldShowTransferredToPrimary(application) ? (
                <div className="mt-4" onClick={(event) => event.preventDefault()}>
                    <Button
                        type="button"
                        disabled
                        className="h-10 w-full cursor-not-allowed rounded-full bg-gray-100 text-sm font-semibold text-gray-400"
                    >
                        Transferred to primary wallet
                    </Button>
                </div>
            ) : null}
        </div>
    );

    const card = hasCardAction ? (
        <div className="block">
            <Link href={accountDetailsHref} className="block">
                {content}
            </Link>
            {userId && transferable ? (
                <TransferToPrimaryDrawer
                    open={transferOpen}
                    onOpenChange={setTransferOpen}
                    userId={userId}
                    applicationId={application.id}
                    productName={application.productName}
                    productType={application.productType || activeFilter}
                    availableBalance={productBalance}
                    currency={application.currency || currency || 'NGN'}
                    onSuccess={() => onTransferSuccess?.(application.id)}
                />
            ) : null}
        </div>
    ) : (
        <Link
            href={accountDetailsHref}
            aria-label={`Open ${activeFilter.toLowerCase()} details`}
            className="block"
        >
            {content}
        </Link>
    );

    return card;
}

export default function AccountsPage() {
    const [profile, setProfile] = useState<AuthUserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<AccountFilter>('Mortgage');
    const { appId } = useMobileV2Tenant();
    const { wallet, loading: walletLoading, error: walletError, refetch: refetchWallet } = useUserWallet();
    const [approvedSummary, setApprovedSummary] = useState<ApprovedAmountSummary | null>(null);
    const [applications, setApplications] = useState<ProductApplication[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsError, setApplicationsError] = useState<string | null>(null);
    const activeProductType = ACCOUNT_FILTER_TO_PRODUCT_TYPE[activeFilter] as ApprovedProductType;

    const approvedListParams = useMemo(
        () => ({
            productType: activeProductType,
            appId: appId || undefined,
            status: 'APPROVED',
            page: 1,
            limit: 20,
        }),
        [activeProductType, appId],
    );

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
        if (!userId || !appId) {
            setApprovedSummary(null);
            return;
        }

        let cancelled = false;
        setSummaryLoading(true);
        setSummaryError(null);

        void fetchApprovedAmountSummary(userId, appId).then((result) => {
            if (cancelled) return;
            setApprovedSummary(result.summary);
            setSummaryError(result.error);
            setSummaryLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [wallet?.userId, appId]);

    useEffect(() => {
        const userId = wallet?.userId;
        if (!userId || !appId) {
            setApplications([]);
            return;
        }

        let cancelled = false;
        setApplications([]);
        setApplicationsLoading(true);
        setApplicationsError(null);

        void fetchUserProductApplications(userId, approvedListParams).then((result) => {
            if (cancelled) return;
            setApplications(result.applications);
            setApplicationsError(result.error);
            setApplicationsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [wallet?.userId, appId, approvedListParams]);

    const reloadApplications = useCallback(() => {
        const userId = wallet?.userId;
        if (!userId || !appId) return;
        void fetchUserProductApplications(userId, approvedListParams).then((result) => {
            setApplications(result.applications);
            setApplicationsError(result.error);
        });
        void fetchApprovedAmountSummary(userId, appId).then((result) => {
            setApprovedSummary(result.summary);
            setSummaryError(result.error);
        });
        void refetchWallet();
    }, [wallet?.userId, appId, approvedListParams, refetchWallet]);

    const handleTransferSuccess = useCallback(
        (transferredApplicationId: string) => {
            setApplications((prev) =>
                prev.map((app) => withZeroProductWallet(app, transferredApplicationId)),
            );
            void fetchApplicationById(transferredApplicationId).then((byId) => {
                if (!byId.ok || !byId.application?.productWallet) return;
                setApplications((prev) =>
                    prev.map((app) =>
                        app.id === transferredApplicationId
                            ? { ...app, productWallet: byId.application!.productWallet }
                            : app,
                    ),
                );
            });
            reloadApplications();
        },
        [reloadApplications],
    );

    const displayName = useMemo(() => displayNameFromProfile(profile), [profile]);
    const totalLabel = ACCOUNT_TOTAL_LABELS[activeFilter];
    const activeBucket: ApprovedAmountBucket =
        approvedSummary?.summary?.[activeProductType] ??
        emptyAmountBucket(wallet?.currency || 'NGN');
    const activeApplications = applications.filter(
        (application) => String(application.productType || '').toUpperCase() === activeProductType,
    );
    const displayedApplications = selectDisplayableProductAccounts(activeApplications);
    const displayedAccountCount = Number(activeBucket.applicationCount) || 0;
    const activeTotalAmount = Number(activeBucket.totalAmount) || 0;
    const activeFormattedBalance = formatApprovedTotal(
        activeTotalAmount,
        activeBucket.currency || wallet?.currency || 'NGN',
    );
    const isSummaryBusy = walletLoading || summaryLoading || applicationsLoading;

    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-[calc(7rem+env(safe-area-inset-bottom))]">
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
                    {isSummaryBusy && !approvedSummary ? (
                        <WalletBalanceCardSkeleton />
                    ) : (
                        <div className="relative isolate w-full h-[220px] rounded-[30px] overflow-hidden bg-[var(--sf-button,#1E40AF)] shadow-xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />
                            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4 px-4">
                                <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white/90" />
                                </div>
                                <span className="text-sm font-medium text-white/70 mb-1">{totalLabel}</span>
                                <h2 className="text-4xl font-bold mb-2 min-h-[2.5rem] flex items-center justify-center">
                                    {isSummaryBusy ? (
                                        <Skeleton className="h-10 w-40 rounded-lg bg-white/25" />
                                    ) : walletError || summaryError ? (
                                        <span className="text-lg font-semibold text-white/70">—</span>
                                    ) : (
                                        activeFormattedBalance
                                    )}
                                </h2>
                                <p className="text-[11px] text-white/70 text-center max-w-[280px]">
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
                    {applicationsLoading || (isSummaryBusy && !approvedSummary && applications.length === 0) ? (
                        <WalletAccountRowSkeleton />
                    ) : displayedApplications.length > 0 ? (
                        displayedApplications.map((application) => (
                            <ProductAccountCard
                                key={application.id}
                                application={application}
                                activeFilter={activeFilter}
                                userId={wallet?.userId}
                                currency={wallet?.currency}
                                onWithdrawComplete={reloadApplications}
                                onTransferSuccess={handleTransferSuccess}
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
