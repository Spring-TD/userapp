'use client';

import React, { useEffect, useState } from 'react';
import { MobileV2ProductList, MobileV2TabBar } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import Link from 'next/link';
import { hasPendingMortgageSavings, mortgagePendingSavingsHref } from '@/lib/mortgageDownPaymentSavings';

export default function MortgageProductPage() {
    const [showPendingSavings, setShowPendingSavings] = useState(false);

    useEffect(() => {
        setShowPendingSavings(hasPendingMortgageSavings());
    }, []);

    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="sticky top-0 z-30 sf-page-bg px-6 pb-2 pt-4 md:pt-9">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <h1 className="text-left text-lg font-bold text-[var(--sf-ink,#1E1B4B)]">Mortgage</h1>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {showPendingSavings ? (
                                <Link
                                    href={mortgagePendingSavingsHref()}
                                    className="rounded-lg bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                                >
                                    Pending Savings
                                </Link>
                            ) : null}
                            <Link
                                href="/mobile-v2/products/mortgage/pending"
                                className="rounded-lg bg-[var(--sf-ink,#1E1B4B)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                            >
                                Pending Mortgage
                            </Link>
                        </div>
                    </div>
                    <MobileV2TabBar activeTab="Mortgage" />
                </div>

                <div className="p-6">
                    <MobileV2ProductList productType="Mortgage" />
                </div>
            </div>

            <MobileV2BottomNav active="products" />
        </div>
    );
}
