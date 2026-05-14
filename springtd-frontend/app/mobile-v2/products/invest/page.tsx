'use client';

import React from 'react';
import Link from 'next/link';
import { Home, User, Briefcase } from 'lucide-react';
import { MobileV2TabBar, MobileV2ProductList } from '../MobileV2ProductComponents';

export default function InvestProductPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="pt-12 px-6 pb-2 bg-white sticky top-0 z-30">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10" />
                        <h1 className="text-lg font-bold text-[#1E1B4B]">Invest</h1>
                        <div className="w-10 h-10" />
                    </div>
                    <MobileV2TabBar activeTab="Invest" />
                </div>

                <div className="p-6">
                    <MobileV2ProductList productType="Invest" />
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
                <button className="flex flex-col items-center gap-1 text-[#1E40AF]">
                    <Briefcase className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Product</span>
                </button>
                <Link href="/mobile-v2/profile" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>
        </div>
    );
}
