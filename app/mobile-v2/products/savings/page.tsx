'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { LockKeyhole, PiggyBank, Target, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileV2TabBar } from '../MobileV2ProductComponents';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { useMobileProducts } from '@/hooks/useMobileProducts';
import type { MobileProduct } from '@/lib/storefrontProducts';
import { rateLabel } from '@/lib/mobileProductDetailDisplay';
import { getSavingsProductGradientClass } from '@/lib/savingsCardTheme';
import { SavingsGradientCard } from '@/components/mobile-v2/savings/SavingsGradientCard';

const CARD_ICONS = [PiggyBank, Landmark, LockKeyhole, Target] as const;

function savingsBadge(plan: MobileProduct): string {
    const haystack = `${plan.name} ${plan.subType || ''} ${plan.description || ''}`.toLowerCase();
    if (plan.isFeatured) return 'Popular';
    if (/\b(bank|agmb|mortgage bank)\b/.test(haystack)) return 'Bank-backed';
    if (/\b(christmas|dezemba|seasonal|festive)\b/.test(haystack)) return 'Seasonal';
    if (/\b(lock|locked|fixed|term)\b/.test(haystack)) return 'Locked';
    if (/\b(starter|shanty|beginner)\b/.test(haystack)) return 'Starter';
    if (/\b(flex|flexible|regular)\b/.test(haystack)) return 'Flexible';
    return 'Savings';
}

function returnPercent(plan: MobileProduct): string {
    const raw = rateLabel(plan);
    if (!raw || /rate available/i.test(raw)) return '—';
    const match = raw.match(/[\d.]+/);
    if (!match) return raw.includes('%') ? raw : `${raw}%`;
    return `${match[0]}%`;
}

function SavingsCard({ plan, index }: { plan: MobileProduct; index: number }) {
    const Icon = CARD_ICONS[index % CARD_ICONS.length];
    const gradientClass = getSavingsProductGradientClass(plan.id);
    const detailHref = `/mobile-v2/products/savings/flex-naira?productId=${encodeURIComponent(plan.id)}`;
    const percent = returnPercent(plan);
    const badge = savingsBadge(plan);
    const desc = plan.description || plan.subType || 'A savings plan tailored for your goals.';

    return (
        <Link
            href={detailHref}
            aria-label={`View ${plan.name}, ${percent} per annum returns`}
            className="block transition-transform active:scale-[0.98]"
        >
            <SavingsGradientCard
                gradientClass={gradientClass}
                className="flex min-h-[250px] flex-col p-4 text-left"
            >
                <div className="flex flex-1 flex-col">
                <div className="mb-3.5 flex items-start justify-between gap-2">
                    <div
                        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-white/20"
                        aria-hidden
                    >
                        <Icon className="h-[17px] w-[17px] text-white" strokeWidth={2.25} />
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-white/15 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                        {badge}
                    </span>
                </div>

                <h3 className="mb-1.5 line-clamp-2 text-base font-extrabold leading-snug text-white">
                    {plan.name}
                </h3>
                <p className="mb-3.5 line-clamp-2 flex-grow text-[11.5px] leading-snug text-white/80">
                    {desc}
                </p>

                <div className="mb-3 flex items-baseline gap-1.5">
                    <span className="text-[19px] font-extrabold text-white">{percent}</span>
                    <span className="text-[10.5px] font-bold text-white/70">p.a. returns</span>
                </div>

                <span className="block rounded-full bg-white py-2.5 text-center text-[13px] font-extrabold text-[#171321]">
                    View
                </span>
            </div>
            </SavingsGradientCard>
        </Link>
    );
}

export default function SavingsProductPage() {
    const { appId, ready: tenantReady } = useMobileV2Tenant();
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
        <div className="relative flex h-full min-h-0 flex-col bg-[#F3F1FB]">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">
                <div className="sticky top-0 z-30 bg-[#F3F1FB] px-4 pb-0 pt-5 md:pt-9">
                    <MobileV2TabBar activeTab="Savings" variant="ink" />
                </div>

                <div className="px-4 pb-10 pt-2">
                    <h2 className="mb-3.5 mt-2 text-lg font-extrabold text-[#171321]">Hot Savings</h2>
                    {!tenantReady || loading ? (
                        <MobileV2ProductListSkeleton />
                    ) : orderedPlans.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {orderedPlans.map((plan, index) => (
                                <SavingsCard key={plan.id} plan={plan} index={index} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-[#171321]/15 bg-white px-5 py-10 text-center shadow-sm">
                            <p className="text-sm font-extrabold text-[#171321]">No active savings products yet</p>
                            <p className="mt-2 text-xs leading-relaxed text-[#6B6478]">
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
