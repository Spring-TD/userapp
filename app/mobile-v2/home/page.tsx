'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ChevronRight,
    Home,
    User,
    CreditCard,
    PieChart,
    Landmark,
    Briefcase,
    ShoppingCart,
    Plus,
    Send as SendIcon,
    ArrowDownLeft,
    FileText,
    Building2,
    X,
} from 'lucide-react';
import { CopyableDetailRow } from '@/components/mobile-v2/CopyableDetailRow';
import { WalletBalanceCardSkeleton } from '@/components/mobile-v2/data-skeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserWallet } from '@/hooks/useUserWallet';
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile';
import { fetchUserWalletTransactions } from '@/lib/services/userWalletApi';
import {
    formatWalletBalance,
    isVirtualNubanActive,
    walletTransactionMethodLabel,
    walletTransactionTitle,
} from '@/lib/userWallet';
import type { AuthUserProfile } from '@/lib/userProfileClient';
import { HomeStorefrontProducts } from '@/components/mobile-v2/HomeStorefrontProducts';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { useMobileProducts } from '@/hooks/useMobileProducts';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { MobileV2NotificationBell } from '@/components/mobile-v2/MobileV2NotificationBell';
import {
    getDisplayProductType,
    storefrontProductTypeRoute,
    type StorefrontProductType,
} from '@/lib/storefrontProducts';
import type { WalletTransaction } from '@/types/userWallet';

function profileAvatarUrl(user: ReturnType<typeof useAuthUserProfile>['user']): string | null {
    if (!user) return null
    const u = user as AuthUserProfile & { avatar_url?: string; profile_image?: string; image?: string }
    const raw = u.avatar_url || u.profile_image || u.image
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim()
    return null
}

function displayNameFromProfile(user: ReturnType<typeof useAuthUserProfile>['user']): string {
    if (!user) return ''
    const first = (user.first_name || '').trim()
    const last = (user.last_name || '').trim()
    if (first && last) return `${first} ${last}`
    if (first) return first
    if (last) return last
    return ''
}

function profileInitials(user: ReturnType<typeof useAuthUserProfile>['user']): string {
    if (!user) return ''
    const a = (user.first_name || '').trim()[0]
    const b = (user.last_name || '').trim()[0]
    const fromName = `${a || ''}${b || ''}`.toUpperCase()
    return fromName ? fromName.slice(0, 2) : ''
}

function formatTransactionTime(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('en-NG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).toLowerCase();
}

type QuickActionItem = {
    icon: React.ReactNode;
    label: string;
    subtitle?: string;
    link?: string;
};

const PRODUCT_QUICK_ACTIONS: {
    type: StorefrontProductType;
    icon: React.ReactNode;
    label: string;
}[] = [
    { type: 'Loan', icon: <Briefcase className="w-6 h-6" />, label: 'Loan' },
    { type: 'Mortgage', icon: <Home className="w-6 h-6" />, label: 'Mortgage' },
    { type: 'Savings', icon: <Landmark className="w-6 h-6" />, label: 'Saving' },
    { type: 'Commodity', icon: <ShoppingCart className="w-6 h-6" />, label: 'Shop' },
];

export default function HomePage() {
    const router = useRouter();
    const { appId, ready: tenantReady, error: tenantError } = useMobileV2Tenant();
    const {
        products: appProducts,
        loading: productsLoading,
        error: productsError,
    } = useMobileProducts({
        springAppId: appId ?? undefined,
        tenantReady,
    });
    const enabledTypes = new Set(appProducts.map((p) => getDisplayProductType(p)));
    const productQuickLinks: QuickActionItem[] = PRODUCT_QUICK_ACTIONS.filter(
        (a) => appProducts.length === 0 || enabledTypes.has(a.type),
    ).map((a) => ({
        icon: a.icon,
        label: a.label,
        link: storefrontProductTypeRoute(a.type),
    }));

    const [activeModal, setActiveModal] = useState<'none' | 'fund_options' | 'fund_bank'>('none');
    const { user: profile, loading: profileLoading, kycApproved } = useAuthUserProfile();
    const { wallet, formattedBalance, loading: walletLoading, error: walletError, notFound } = useUserWallet();
    const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    const nuban = wallet?.virtualNuban;
    const nubanReady = isVirtualNubanActive(wallet);
    const accountHolder = wallet?.name || displayNameFromProfile(profile) || '—';
    const fundingUnavailableMessage = nuban?.provisionError ||
        (kycApproved
            ? 'Your bank transfer account is still being activated.'
            : 'Complete identity verification to activate your bank transfer account.');
    const showCompleteKycCta = !nubanReady && !kycApproved;

    const quickActions: QuickActionItem[] = useMemo(() => {
        const utilityQuickActions: QuickActionItem[] = [
            { icon: <Plus className="w-6 h-6" />, label: 'Top Up' },
            {
                icon: <ArrowDownLeft className="w-6 h-6" />,
                label: 'Withdraw',
                subtitle: walletLoading ? '…' : formattedBalance,
                link: '/mobile-v2/withdraw',
            },
            { icon: <FileText className="w-6 h-6" />, label: 'Orders', link: '/mobile-v2/orders' },
        ];
        return [...productQuickLinks, ...utilityQuickActions];
    }, [productQuickLinks, walletLoading, formattedBalance]);

    useEffect(() => {
        const userId = wallet?.userId;
        if (!userId) {
            setRecentTransactions([]);
            return;
        }

        let cancelled = false;
        setTransactionsLoading(true);

        void fetchUserWalletTransactions(userId, { limit: 5 }).then((result) => {
            if (cancelled) return;
            setRecentTransactions(result.transactions);
            setTransactionsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [wallet?.userId]);

    const displayGreetingName = useMemo(() => displayNameFromProfile(profile), [profile]);

    const avatarSrc = profileAvatarUrl(profile);
    const initials = profileInitials(profile);
    const sortedRecentTransactions = useMemo(
        () => [...recentTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [recentTransactions],
    );
    const lastTransaction = sortedRecentTransactions[0] ?? null;

    const closeModal = () => setActiveModal('none');

    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-[calc(7rem+env(safe-area-inset-bottom))]">
            {/* Header */}
            <div className="px-6 pt-12 pb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-[19px] font-bold text-[#1E293B]">
                        Hello
                        {profileLoading ? (
                            <>
                                {' '}
                                <span className="text-[var(--sf-ink,#1E1B4B)] inline-flex items-center">
                                    <Skeleton className="inline-block h-[1.15em] w-36 max-w-[55vw] rounded-md bg-gray-200/90" aria-hidden />
                                </span>
                            </>
                        ) : displayGreetingName ? (
                            <>
                                {' '}
                                <span className="text-[var(--sf-ink,#1E1B4B)] inline-flex items-center">{displayGreetingName}</span>
                            </>
                        ) : null}
                    </h1>
                    <p className="text-gray-500 text-[13px] min-h-[1.25rem]">
                        {profileLoading ? (
                            <Skeleton className="mt-0.5 h-4 w-52 max-w-[70vw] rounded-md bg-gray-200/90" aria-hidden />
                        ) : profile ? (
                            'Your finances are looking good'
                        ) : (
                            'Sign in to personalise your home'
                        )}
                    </p>
                </div>
                <MobileV2NotificationBell />
            </div>

            {/* Balance Card */}
            <div className="px-6 mb-6">
                {walletLoading && !wallet ? (
                    <WalletBalanceCardSkeleton />
                ) : (
                <div className="relative isolate w-full h-[220px] rounded-[30px] overflow-hidden bg-[var(--sf-button,#1E40AF)] shadow-xl shadow-blue-900/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10" />

                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4">
                        {/* Avatar in Card */}
                        <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm">
                            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--sf-primary,#2563EB)] to-[var(--sf-button,#1E40AF)]">
                                {avatarSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- optional remote URL from API
                                    <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-sm font-bold text-white flex items-center justify-center" aria-hidden>
                                        {profileLoading ? (
                                            <Skeleton className="h-8 w-8 shrink-0 rounded-full bg-white/30" aria-hidden />
                                        ) : initials ? (
                                            initials
                                        ) : (
                                            <User className="h-5 w-5 text-white/90" aria-hidden />
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>

                        <span className="text-sm font-medium text-blue-100 mb-1">Your available balance is</span>
                        <h2 className="text-4xl font-bold mb-2 min-h-[2.5rem] flex items-center justify-center gap-2">
                            {walletLoading ? (
                                <Skeleton className="h-10 w-40 max-w-[70vw] rounded-lg bg-white/25" aria-label="Loading balance" />
                            ) : walletError ? (
                                <span className="text-lg font-semibold text-blue-100">—</span>
                            ) : (
                                formattedBalance
                            )}
                        </h2>
                        <p className="text-[11px] text-blue-200/90 px-2 text-center max-w-[280px]">
                            {notFound
                                ? 'No wallet is linked to your account yet. Sign out and sign in again, or complete signup if you are new.'
                                : walletError
                                  ? walletError
                                  : nubanReady
                                    ? 'Fund via your virtual account below.'
                                    : 'Balance reflects your main wallet.'}
                        </p>
                    </div>
                </div>
                )}
            </div>

            {/* Main Actions */}
            <div className="px-6 flex gap-3 mb-6">
                <button
                    onClick={() => setActiveModal('fund_options')}
                    className="flex-1 w-full h-12 rounded-full bg-[var(--sf-ink,#1E1B4B)] text-white hover:bg-[var(--sf-ink,#1E1B4B)]/90 text-[13px] font-semibold flex items-center justify-center"
                >
                    Fund
                </button>
                {/* <button
                    onClick={() => router.push('/mobile-v2/send')}
                    className="flex-1 w-full h-12 rounded-full bg-[#94A3B8] text-white hover:bg-[#94A3B8]/90 text-[13px] font-semibold flex items-center justify-center"
                >
                    Send
                </button> */}
                <button
                    onClick={() => router.push('/mobile-v2/withdraw')}
                    className="flex-1 w-full min-h-12 rounded-full bg-white border border-[#E5E7EB] text-[#111827] hover:bg-gray-50 text-[13px] font-semibold flex flex-col items-center justify-center gap-0.5 py-2"
                >
                    <span>Withdraw</span>
                </button>
            </div>

            {/* <HomeStorefrontProducts
                products={appProducts}
                loading={productsLoading}
                error={productsError}
                tenantReady={tenantReady}
                appId={appId}
                tenantError={tenantError}
            /> */}

            {/* Quick Actions Grid */}
            <div className="px-6 mb-6">
                <h3 className="font-bold text-[#1E293B] mb-4">Quick Actions</h3>
                <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                    {quickActions.map((item, idx) => {
                        const Content = (
                            <>
                                <div className="w-[50px] h-[50px] rounded-[18px] bg-white border border-gray-100 shadow-sm flex items-center justify-center text-[var(--sf-primary,#2563EB)] group-hover:bg-[var(--sf-tint,#E0E7FF)] transition-colors">
                                    {item.icon}
                                </div>
                                <span className="text-[11px] font-medium text-gray-500">{item.label}</span>
                                {item.subtitle ? (
                                    <span className="text-[9px] font-semibold text-[var(--sf-primary,#2563EB)]">
                                        {item.subtitle}
                                    </span>
                                ) : null}
                            </>
                        );

                        return item.link ? (
                            <Link key={idx} href={item.link} className="flex flex-col items-center gap-2 group">
                                {Content}
                            </Link>
                        ) : (
                            <button
                                key={idx}
                                type="button"
                                onClick={
                                    item.label === 'Top Up'
                                        ? () => setActiveModal('fund_options')
                                        : item.label === 'Send'
                                          ? () => router.push('/mobile-v2/send')
                                          : undefined
                                }
                                className="flex flex-col items-center gap-2 group"
                            >
                                {Content}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Last Transaction */}
            <div className="px-6 mb-5">
                <Link
                    href="/mobile-v2/transactions"
                    className="w-full min-h-[72px] bg-[var(--sf-button,#1E40AF)] rounded-[16px] flex items-center px-3.5 relative overflow-hidden shadow-lg shadow-blue-900/5"
                >
                    <div className="w-10 h-10 rounded-[10px] bg-[var(--sf-ink,#1E1B4B)]/30 flex items-center justify-center text-white mr-3 shadow-inner">
                        <PieChart className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 text-white">
                        <h3 className="font-semibold text-sm">Last transactions</h3>
                        {transactionsLoading ? (
                            <Skeleton className="mt-1 h-3 w-40 rounded-full bg-white/25" />
                        ) : lastTransaction ? (
                            <p className="mt-1 truncate text-[11px] text-blue-100">
                                <span className="font-semibold text-white">{formatWalletBalance(lastTransaction.amount)}</span>{' '}
                                {lastTransaction.type === 'CREDIT' ? 'credit from' : 'debit to'}{' '}
                                <span className="font-semibold text-white">{walletTransactionTitle(lastTransaction)}</span>
                            </p>
                        ) : (
                            <p className="mt-1 text-[11px] text-blue-100">No wallet activity yet</p>
                        )}
                    </div>
                    <div className="ml-3 w-9 h-9 rounded-full bg-white flex items-center justify-center text-[var(--sf-button,#1E40AF)] shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </Link>
            </div>

            {/* Recent Transactions */}
            <section className="px-6 mb-8">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-[#1E293B]">Recent Transactions</h3>
                    <Link href="/mobile-v2/transactions" className="text-[var(--sf-ink,#1E1B4B)]" aria-label="View transactions">
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>
                {transactionsLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full rounded-2xl bg-gray-200/90" />
                        <Skeleton className="h-12 w-full rounded-2xl bg-gray-200/90" />
                    </div>
                ) : sortedRecentTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {sortedRecentTransactions.slice(0, 3).map((transaction) => {
                            const isCredit = transaction.type === 'CREDIT';
                            return (
                                <Link
                                    href="/mobile-v2/transactions"
                                    key={transaction.id}
                                    className="flex min-h-[72px] items-center justify-between rounded-[14px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-gray-400">{walletTransactionMethodLabel(transaction)}</p>
                                        <p className="truncate text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">{walletTransactionTitle(transaction)}</p>
                                    </div>
                                    <div className="ml-3 shrink-0 text-right">
                                        <p className={`text-sm font-semibold ${isCredit ? 'text-[#00A83B]' : 'text-[#FF0000]'}`}>
                                            {formatWalletBalance(transaction.amount)}
                                        </p>
                                        <p className="mt-1 text-[11px] font-medium text-gray-400">{formatTransactionTime(transaction.createdAt)}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <p className="rounded-2xl bg-white px-4 py-4 text-sm text-gray-500 shadow-sm">No recent transactions yet.</p>
                )}
            </section>
            </div>

            {/* --- MODALS --- */}

            {/* Backdrop */}
            {activeModal !== 'none' && (
                <div
                    className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={closeModal}
                />
            )}

            {/* Modal 1: Fund Options */}
            {activeModal === 'fund_options' && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-[var(--sf-ink,#1E1B4B)]">Choose ways to Fund wallet</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <div className="space-y-6">
                        <button
                            onClick={() => setActiveModal('fund_bank')}
                            className="flex items-start gap-4 w-full text-left group"
                        >
                            <div className="w-12 h-12 rounded-full bg-[var(--sf-tint,#E0E7FF)] flex items-center justify-center text-[var(--sf-primary,#2563EB)] shrink-0">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-[var(--sf-ink,#1E1B4B)]">Add via bank transfer</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {nubanReady
                                        ? 'Fund your wallet by sending money to your unique NGN bank account.'
                                        : fundingUnavailableMessage}
                                </p>
                            </div>
                        </button>
                        <button className="flex items-start gap-4 w-full text-left group">
                            <div className="w-12 h-12 rounded-full bg-[var(--sf-tint,#E0E7FF)] flex items-center justify-center text-[var(--sf-primary,#2563EB)] shrink-0">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-[var(--sf-ink,#1E1B4B)]">Add via Card</h3>
                                <p className="text-sm text-gray-500 mt-1">Add funds from your card to your wallet.</p>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal 2: Fund via Bank Details */}
            {activeModal === 'fund_bank' && (
                <div className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)] pr-8">Fund wallet via Bank Transfer</h2>
                        <button onClick={closeModal}><X className="w-5 h-5 text-gray-400" /></button>
                    </div>

                    <div className="space-y-6 mb-8">
                        {walletLoading ? (
                            <>
                                <Skeleton className="h-10 w-full rounded-md bg-gray-200/90" />
                                <Skeleton className="h-10 w-full rounded-md bg-gray-200/90" />
                                <Skeleton className="h-10 w-full rounded-md bg-gray-200/90" />
                            </>
                        ) : (
                            nubanReady ? (
                                <>
                                    <CopyableDetailRow label="Account Holder" value={accountHolder} />
                                    <CopyableDetailRow label="Account Number" value={nuban?.accountNumber} />
                                    <CopyableDetailRow label="Bank Name" value={nuban?.bankName} />
                                </>
                            ) : (
                                <div className="rounded-2xl sf-accent-soft p-4">
                                    <p className="text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">Bank account not active yet</p>
                                    <p className="mt-1 text-sm text-gray-600">{fundingUnavailableMessage}</p>
                                    {showCompleteKycCta ? (
                                    <Link
                                        href="/mobile-v2/profile/kyc/create"
                                        className="mt-3 inline-flex h-10 items-center rounded-full bg-[var(--sf-button,#1E40AF)] px-4 text-sm font-semibold text-white"
                                    >
                                        Complete KYC
                                    </Link>
                                    ) : null}
                                </div>
                            )
                        )}
                    </div>

                    <div className="bg-[#FEF3C7] rounded-xl p-4 text-[#92400E] text-xs leading-relaxed">
                        <p className="font-bold mb-2">Please take note of the following when sending money to your NGN account:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>The account can only receive funds in Nigeria Naira (NGN)</li>
                            <li>Payments will take a few mins to reflect.</li>
                            <li>There are no additional fees on deposits.</li>
                        </ul>
                    </div>
                </div>
            )}

            <MobileV2BottomNav active="home" />

        </div>
    );
}
