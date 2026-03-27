'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Bell,
    Home,
    User,
    Briefcase,
    Plus,
    Eye,
    EyeOff
} from 'lucide-react';

export default function AccountsPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="px-6 pt-12 pb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-[19px] font-bold text-[#1E293B]">
                            Hello <span className="text-[#1E1B4B]">John</span>
                        </h1>
                        <p className="text-gray-500 text-[13px]">
                            Your finances are looking good
                        </p>
                    </div>
                    <button className="w-10 h-10 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[#2563EB]">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>

                {/* Total Asset Card */}
                <div className="px-6 mb-8">
                    <div className="relative w-full h-[220px] rounded-[30px] overflow-hidden shadow-xl shadow-blue-900/10">
                        {/* Background */}
                        <div className="absolute inset-0 bg-[#1E40AF]">
                            <div className="absolute inset-0 opacity-10 bg-[url('/home-card-bg.png')] bg-cover bg-center mix-blend-overlay"></div>
                        </div>

                        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white pt-4">
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full border-2 border-green-400/30 p-0.5 mb-3 bg-white/10 backdrop-blur-sm">
                                <div className="relative w-full h-full rounded-full overflow-hidden">
                                    <Image src="/avatar-john.png" alt="User" fill className="object-cover" />
                                </div>
                            </div>

                            <span className="text-sm font-medium text-blue-100 mb-1">Total Asset</span>
                            <h2 className="text-4xl font-bold mb-2">N298,983.75</h2>
                            <p className="text-[11px] text-blue-200 bg-black/10 px-3 py-1 rounded-full backdrop-blur-md">
                                By this time last month, you spent slightly higher (N22,719)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Accounts List */}
                <div className="px-6 flex justify-between items-center mb-4">
                    <h2 className="font-bold text-[#1E293B]">Accounts</h2>
                    <span className="text-xs text-green-500 font-medium">2 Active</span>
                </div>

                <div className="px-6 space-y-4">
                    {/* Mortgage Account Card */}
                    <Link href="/mobile-v2/products/mortgage" className="block">
                        <div className="w-full bg-[#EFF6FF] rounded-[24px] p-6 relative">
                            <div className="mb-4">
                                <div className="w-8 h-8 text-[#1E1B4B]">
                                    {/* Simple house icon representation */}
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                </div>
                            </div>
                            <p className="text-sm text-[#1E293B] mb-1 font-medium">Mortgage Account</p>
                            <h3 className="text-2xl font-bold text-[#1E1B4B]">N12,983</h3>

                            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium tracking-wider">****4521</span>
                                <Eye className="w-4 h-4 text-gray-400" />
                                <div className="w-2 h-2 rounded-full bg-black"></div>
                            </div>
                        </div>
                    </Link>

                    {/* Savings Account Card */}
                    <Link href="/mobile-v2/products/savings" className="block">
                        <div className="w-full bg-[#E0F2FE] rounded-[24px] p-6 relative">
                            <div className="mb-4">
                                <div className="w-8 h-8 text-[#1E1B4B]">
                                    {/* Piggy bank representation */}
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8.6-3.8 1.6-1.5 1.5-3.5 1.7-4.1 1.2-1.2-1-2.9-1.3-4.2-.2-2.3 1.9-2.3 6 .3 7.6.6.3 1.1.8 1.1 1.8V20h4v-1.1c.1-.8.9-1.3 1.7-1.1 2.5.6 4.9.6 5.6 0 .8-.6 1.1-3 1.1-6.9 0-2.2-1-4.8-1.7-5.9" /></svg>
                                </div>
                            </div>
                            <p className="text-sm text-[#1E293B] mb-1 font-medium">Savings Account</p>
                            <h3 className="text-2xl font-bold text-[#1E1B4B]">N285,983.75</h3>

                            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium tracking-wider">****4521</span>
                                <Eye className="w-4 h-4 text-gray-400" />
                                <div className="w-2 h-2 rounded-full bg-black"></div>
                            </div>
                        </div>
                    </Link>

                    {/* Add New Account */}
                    <button className="w-full h-[120px] rounded-[24px] border-2 border-dashed border-blue-300 bg-[#EFF6FF]/50 flex flex-col items-center justify-center gap-2 text-[#2563EB] hover:bg-[#EFF6FF] transition-colors">
                        <Plus className="w-8 h-8" />
                        <span className="text-sm font-bold">Add New Account</span>
                        <span className="text-xs text-gray-400 font-normal">Create another account</span>
                    </button>
                </div>
            </div>

            {/* Bottom Nav - Fixed Position outside scrollable area */}
            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-50">
                <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-[#1E40AF]">
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
