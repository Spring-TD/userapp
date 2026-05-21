'use client';

import React from 'react';
import { MobileV2TabBar, MobileV2ProductList } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';

export default function InvestProductPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="pt-12 px-6 pb-2 bg-white sticky top-0 z-30">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10" />
                        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Invest</h1>
                        <div className="w-10 h-10" />
                    </div>
                    <MobileV2TabBar activeTab="Invest" />
                </div>

                <div className="p-6">
                    <MobileV2ProductList productType="Invest" />
                </div>
            </div>

            <MobileV2BottomNav active="products" />
        </div>
    );
}
