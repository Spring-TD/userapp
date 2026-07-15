'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { LockKeyhole, PiggyBank, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileV2TabBar } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { useMobileProducts } from '@/hooks/useMobileProducts';
import type { MobileProduct } from '@/lib/storefrontProducts';
import { poweredBy } from '@/lib/mobileProductDetailDisplay';

const SAVINGS_ICONS = [PiggyBank, Target, LockKeyhole];

function SavingsCard({ plan, index, providerName }: { plan: MobileProduct; index: number; providerName: string }) {
    const Icon = SAVINGS_ICONS[index % SAVINGS_ICONS.length];
    const detailHref = `/mobile-v2/products/savings/flex-naira?productId=${encodeURIComponent(plan.id)}`;

    return (
        <div className="rounded-[10px] bg-[#1F1F1F] p-3 text-white shadow-lg shadow-black/10">
            <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-[9px] font-medium text-white/60">
                    By {providerName}
                </p>
                {plan.isFeatured ? (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-bold uppercase text-white">
                        Featured
                    </span>
                ) : null}
            </div>
            <div className="mb-2">
                <Icon className="h-5 w-5 text-[var(--sf-primary,#2563EB)]" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-[var(--sf-primary,#2563EB)]">
                {plan.name}
            </h3>
            <p className="mb-2 text-[12px] leading-relaxed text-white/85">
                {plan.description || plan.subType || 'Savings product'}
            </p>
            {plan.interestRate ? (
                <p className="mb-3 text-[11px] font-semibold text-white">
                    Up to {plan.interestRate.includes('%') ? plan.interestRate : `${plan.interestRate}%`} returns
                </p>
            ) : null}
            <Link href={detailHref}>
                <Button className="h-9 w-full rounded-xl bg-[var(--sf-button,#2563EB)] text-xs font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
                    View
                </Button>
            </Link>
        </div>
    );
}

export default function SavingsProductPage() {
    const { appId, ready: tenantReady, displayName } = useMobileV2Tenant();
    const { loading, error, getProductsByType } = useMobileProducts({
        springAppId: appId ?? undefined,
        tenantReady,
    });
    const savingsPlans = getProductsByType('Savings');
    const orderedPlans = useMemo(() => {
        const featured = savingsPlans.filter((product) => product.isFeatured);
        const regular = savingsPlans.filter((product) => !product.isFeatured);
        return [...featured, ...regular];
    }, [savingsPlans]);

    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header with Tabs */}
                <div className="pt-12 px-6 pb-4 bg-white sticky top-0 z-30">
                    <MobileV2TabBar activeTab="Savings" />
                </div>

                <div className="p-6">
                    <h2 className="mb-6 text-base font-bold text-[#1E293B]">Hot Savings</h2>
                    {!tenantReady || loading ? (
                        <MobileV2ProductListSkeleton />
                    ) : orderedPlans.length > 0 ? (
                        <div className="grid grid-cols-2 gap-5">
                            {orderedPlans.map((plan, index) => (
                                <SavingsCard key={plan.id} plan={plan} index={index} providerName={poweredBy(displayName || undefined)} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm">
                            <p className="text-sm font-semibold text-[#1E293B]">No active savings products yet</p>
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                {error || 'Only products enabled for this app will appear here.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <MobileV2BottomNav active="products" />
        </div>
    );
}
