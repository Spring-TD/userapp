'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ChevronLeft,
    Home,
    User,
    Briefcase,
    ChevronRight,
    LogOut,
    Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthUserProfile } from '@/hooks/useAuthUserProfile';
import type { AuthUserProfile } from '@/lib/userProfileClient';

function fullName(user: AuthUserProfile | null) {
    return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
}

function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
}

function formatDate(value?: string) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleDateString('en-NG', { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function EditProfilePage() {
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const { user, loading, error } = useAuthUserProfile();
    const name = useMemo(() => fullName(user), [user]);
    const displayName = name || 'Profile';
    const avatarUrl = user?.avatar_url || user?.profile_image || user?.image || '';

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-8">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Edit Profile</h1>
                </div>

                <div className="px-6 space-y-8">
                    {/* Avatar Edit */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm">
                                {loading ? (
                                    <Skeleton className="h-full w-full rounded-full bg-gray-200" />
                                ) : avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt={displayName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-[var(--sf-button,#1E40AF)] text-xl font-bold text-white">
                                        {initials(displayName)}
                                    </div>
                                )}
                            </div>
                            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-blue-600 border border-gray-100">
                                <Pencil className="w-4 h-4 fill-current" />
                            </button>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        {error ? (
                            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">{error}</p>
                        ) : null}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[#1E293B] ml-1">Full Name</label>
                            {loading ? (
                                <Skeleton className="h-14 rounded-[16px] bg-gray-200" />
                            ) : (
                                <Input
                                    value={displayName}
                                    readOnly
                                    className="h-14 rounded-[16px] border-gray-300 bg-transparent px-4 text-base"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[#1E293B] ml-1">Email</label>
                            {loading ? (
                                <Skeleton className="h-14 rounded-[16px] bg-gray-200" />
                            ) : (
                                <Input
                                    type="email"
                                    value={user?.email || 'Not provided'}
                                    readOnly
                                    className="h-14 rounded-[16px] border-gray-300 bg-transparent px-4 text-base"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-[#1E293B] ml-1">Phone number</label>
                            {loading ? (
                                <Skeleton className="h-14 rounded-[16px] bg-gray-200" />
                            ) : (
                                <Input
                                    type="tel"
                                    value={user?.phone || 'Not provided'}
                                    readOnly
                                    className="h-14 rounded-[16px] border-gray-300 bg-transparent px-4 text-base"
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <ReadOnlyField label="User type" value={user?.user_type || 'Not available'} loading={loading} />
                            <ReadOnlyField label="Status" value={user?.status || 'Not available'} loading={loading} />
                            <ReadOnlyField label="Country" value={user?.country || 'Not available'} loading={loading} />
                            <ReadOnlyField label="User ref" value={user?.user_ref || 'Not available'} loading={loading} />
                            <ReadOnlyField label="Created" value={formatDate(user?.created_at)} loading={loading} />
                            <ReadOnlyField label="Last login" value={formatDate(user?.last_login_at)} loading={loading} />
                        </div>
                    </div>

                    {/* Account Control */}
                    <div>
                        <h3 className="text-sm font-bold text-[#1E293B] mb-3 ml-1">Account control</h3>
                        <div className="bg-white rounded-[24px] p-1 shadow-sm border border-gray-100">
                            <button
                                onClick={() => setShowLogoutModal(true)}
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-[20px]"
                            >
                                <div className="flex items-center gap-4 text-[#EF4444]">
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-medium">Logout</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-40">
                <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link href="/mobile-v2/accounts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
                <Link href="/mobile-v2/products/savings" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Briefcase className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Product</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-[var(--sf-button,#1E40AF)]">
                    <User className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
            </div>

            {/* Logout Modal - Same as Profile Page */}
            {showLogoutModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowLogoutModal(false)}
                    />
                    <div className="relative bg-white w-full max-w-[320px] rounded-[30px] p-6 flex flex-col items-center animate-in zoom-in-95 duration-200 z-50">
                        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-4">
                            <LogOut className="w-6 h-6 text-[#EF4444]" />
                        </div>
                        <h2 className="text-lg font-bold text-[#1E293B] mb-2">Logout?</h2>
                        <p className="text-sm text-gray-500 text-center mb-8 px-4">
                            Are you sure to logout from your account?
                        </p>
                        <div className="flex gap-3 w-full">
                            <Button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 h-12 rounded-full bg-[#F3F4F6] hover:bg-gray-200 text-[#1E293B] font-semibold text-sm shadow-none"
                            >
                                No, Cancel
                            </Button>
                            <Button
                                className="flex-1 h-12 rounded-full bg-[#EF4444] hover:bg-red-700 text-white font-semibold text-sm shadow-none"
                            >
                                Yes, logout
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReadOnlyField({ label, value, loading }: { label: string; value: string; loading: boolean }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-1 flex min-h-5 items-center text-xs font-bold text-[#1E293B]">
                {loading ? <Skeleton className="h-3.5 w-20 bg-gray-200" /> : value}
            </p>
        </div>
    );
}
