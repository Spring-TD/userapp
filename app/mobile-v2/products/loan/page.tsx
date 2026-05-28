'use client';

import React from 'react';
import { MobileV2ProductList, MobileV2TabBar } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import Link from 'next/link';

export default function LoanProductPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="pt-12 px-6 pb-2 bg-white sticky top-0 z-30">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-lg font-bold text-[var(--sf-ink,#1E1B4B)] text-left">Loan</h1>
                        <Link
                            href="/mobile-v2/products/loan"
                            className="rounded-lg bg-[var(--sf-ink,#1E1B4B)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                        >
                            Pending Loan
                        </Link>
                    </div>
                    <MobileV2TabBar activeTab="Loan" />
                </div>

                <div className="p-6">
                    <MobileV2ProductList productType="Loan" />
                </div>
            </div>

            <MobileV2BottomNav active="products" />
        </div>
    );
}
