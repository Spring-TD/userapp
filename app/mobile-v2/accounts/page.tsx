'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Bell,
    Home,
    User,
    Briefcase,
    Plus,
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

function displayNameFromProfile(user: AuthUserProfile | null): string {
    if (!user) return '';
    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (last) return last;
    return '';
}

export default function AccountsPage() {
    const [profile, setProfile] = useState<AuthUserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
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

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
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

                <div className="px-6 mb-8">
                    {walletLoading && !wallet ? (
                        <WalletBalanceCardSkeleton />
                    ) : (
                        <div className="relative w-full h-[220px] rounded-[30px] overflow-hidden shadow-xl shadow-blue-900/10">
                            <div className="absolute inset-0 bg-[var(--sf-button,#1E40AF)]">
                                <div className="absolute inset-0 opacity-10 bg-[url('/home-card-bg.png')] bg-cover bg-center mix-blend-overlay" />
                            </div>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4 px-4">
                                <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                    <Wallet className="w-6 h-6 text-white/90" />
                                </div>
                                <span className="text-sm font-medium text-blue-100 mb-1">Total balance</span>
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
                                    {walletError || 'Your main wallet balance'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 flex justify-between items-center mb-4">
                    <h2 className="font-bold text-[#1E293B]">Accounts</h2>
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
                        <div className="w-full bg-[#EFF6FF] rounded-[24px] p-6 relative">
                            <div className="mb-4">
                                <div className="w-8 h-8 text-[var(--sf-ink,#1E1B4B)]">
                                    <Wallet className="w-8 h-8" />
                                </div>
                            </div>
                            <p className="text-sm text-[#1E293B] mb-1 font-medium">{walletLabel}</p>
                            <h3 className="text-2xl font-bold text-[var(--sf-ink,#1E1B4B)]">
                                {formattedBalance}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">{statusLabel} · {wallet.currency || 'NGN'}</p>
                            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium tracking-wider">{masked}</span>
                                <Eye className="w-4 h-4 text-gray-400" />
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 px-2">
                            {walletError || 'No wallet linked to this account yet.'}
                        </p>
                    )}

                    <Link href="/mobile-v2/products/mortgage" className="block opacity-60 pointer-events-none">
                        <div className="w-full bg-[#E0F2FE] rounded-[24px] p-6 relative">
                            <p className="text-sm text-[#1E293B] mb-1 font-medium">Product accounts</p>
                            <p className="text-xs text-gray-500">Mortgage & savings — coming soon</p>
                        </div>
                    </Link>

                    <button
                        type="button"
                        disabled
                        className="w-full h-[120px] rounded-[24px] border-2 border-dashed border-blue-300 bg-[#EFF6FF]/50 flex flex-col items-center justify-center gap-2 text-[var(--sf-primary,#2563EB)] opacity-50"
                    >
                        <Plus className="w-8 h-8" />
                        <span className="text-sm font-bold">Add New Account</span>
                        <span className="text-xs text-gray-400 font-normal">Coming soon</span>
                    </button>
                </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-50">
                <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <button type="button" className="flex flex-col items-center gap-1 text-[var(--sf-button,#1E40AF)]">
                    <User className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Account</span>
                </button>
                <Link href="/mobile-v2/products/mortgage" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Briefcase className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Product</span>
                </Link>
                <Link href="/mobile-v2/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>
        </div>
    );
}
