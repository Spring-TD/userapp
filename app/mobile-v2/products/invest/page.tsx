'use client';

import React from 'react';
import { MobileV2TabBar, MobileV2ProductList } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';

export default function InvestProductPage() {
    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="sticky top-0 z-30 sf-page-bg px-6 pb-2 pt-4 md:pt-9">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="h-10 w-10" />
                        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Invest</h1>
                        <div className="h-10 w-10" />
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
