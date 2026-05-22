'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Percent, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileProducts, MobileProduct } from '@/hooks/useMobileProducts';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { cn } from '@/lib/utils';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { loanProductApplyDetailHref } from '@/lib/loanApplyRoutes';
import { mortgageProductApplyDetailHref } from '@/lib/mortgageApplyRoutes';

// ─── Tab bar shared across all V2 product pages ───────────────────────────────
const ALL_TABS = ['Mortgage', 'Loan', 'Savings', 'Invest', 'Commodity'] as const;
type ProductTab = typeof ALL_TABS[number];

const TAB_ROUTES: Record<ProductTab, string> = {
    Mortgage: '/mobile-v2/products/mortgage',
    Loan: '/mobile-v2/products/loan',
    Savings: '/mobile-v2/products/savings',
    Invest: '/mobile-v2/products/invest',
    Commodity: '/mobile-v2/products/commodity',
};

const APPLY_ROUTES: Record<string, string> = {
    Loan: '/mobile-v2/products/loan/apply',
    Mortgage: '/mobile-v2/products/mortgage/apply',
    Savings: '/mobile-v2/products/savings/apply',
    Commodity: '/mobile-v2/products/commodity/apply',
    Invest: '/mobile-v2/products/invest/apply',
};

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function MobileV2TabBar({ activeTab }: { activeTab: ProductTab }) {
    return (
        <div className="w-full bg-[#F3F4F6] p-1.5 rounded-full flex items-center justify-between overflow-x-auto no-scrollbar">
            {ALL_TABS.map((tab) => (
                <Link
                    key={tab}
                    href={TAB_ROUTES[tab]}
                    className={cn(
                        'flex-1 text-center py-2.5 px-4 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                        tab === activeTab
                            ? 'bg-white text-[var(--sf-button,#1E40AF)] shadow-sm'
                            : 'text-gray-400 hover:text-gray-600 bg-transparent'
                    )}
                >
                    {tab}
                </Link>
            ))}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
    type,
    fetchError,
    tenantAppId,
    tenantError,
}: {
    type: string
    fetchError?: string | null
    tenantAppId?: string | null
    tenantError?: string | null
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <PackageOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2">No {type} products yet</h3>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">
                We couldn&apos;t find any active {type.toLowerCase()} products for this storefront. If you expect to see
                products, confirm your Spring app has published products and that you&apos;re scoped to the right app.
            </p>
            {(fetchError || tenantError) && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 max-w-[320px]">
                    {fetchError && <span className="block font-medium">Request: {fetchError}</span>}
                    {tenantError && <span className="mt-1 block font-medium">Tenant: {tenantError}</span>}
                </p>
            )}
            {tenantAppId ? (
                <p className="mt-3 text-[11px] text-gray-400 max-w-[300px]">
                    Current app id from the store: <code className="rounded bg-gray-100 px-1">{tenantAppId}</code>. If
                    this is wrong, open the storefront from your tenant subdomain or add{' '}
                    <code className="rounded bg-gray-100 px-1">?subdomain=…</code> /{' '}
                    <code className="rounded bg-gray-100 px-1">?appId=…</code> once; it is stored for this session.
                </p>
            ) : (
                <p className="mt-3 text-[11px] text-gray-400 max-w-[300px]">
                    Products are loaded using the app id returned by{' '}
                    <code className="rounded bg-gray-100 px-1">GET /api/v1/apps/resolve/&lt;subdomain&gt;</code> (or add{' '}
                    <code className="rounded bg-gray-100 px-1">?appId=…</code> /{' '}
                    <code className="rounded bg-gray-100 px-1">?subdomain=…</code> for local testing).{' '}
                    <code className="rounded bg-gray-100 px-1">?merchant_id=…</code> alone sets signup headers but does not
                    resolve an app id.
                </p>
            )}
        </div>
    );
}

// ─── Loading state (skeleton) ────────────────────────────────────────────────
function LoadingState() {
    return <MobileV2ProductListSkeleton />;
}

// ─── Loan Product Card ────────────────────────────────────────────────────────
export function LoanProductCard({ product }: { product: MobileProduct }) {
    const detailRoute = loanProductApplyDetailHref(product.id);

    return (
        <div className="bg-[var(--sf-ink,#1E1B4B)] rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="flex flex-col mb-4">
                <span className="text-[10px] text-blue-200 mb-1 font-medium block">Loan Amount</span>
                <h2 className="text-xl font-bold tracking-tight mb-4">{product.name}</h2>

                <div className="flex gap-4">
                    {product.duration && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-blue-200" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[9px] text-blue-300 mb-0.5">Duration</span>
                                <span className="text-[11px] font-bold">{product.duration}</span>
                            </div>
                        </div>
                    )}
                    {product.interestRate && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Percent className="w-3.5 h-3.5 text-blue-200" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[9px] text-blue-300 mb-0.5">Interest</span>
                                <span className="text-[11px] font-bold">{product.interestRate}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {product.description && (
                <p className="text-[11px] text-blue-100 mb-4 leading-relaxed font-light opacity-90 pr-2 line-clamp-2">
                    {product.description}
                </p>
            )}

            <div className="flex items-center justify-end mt-auto">
                <Link href={detailRoute}>
                    <Button className="h-9 rounded-xl bg-[var(--sf-primary,#2563EB)] hover:bg-[var(--sf-primary,#2563EB)] text-white text-[11px] font-semibold px-4 shadow-lg shadow-blue-500/20">
                        Apply for Loan
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Featured mortgage (carousel dots + Get Started → detail) ───────────────
export function FeaturedMortgageCard({ product }: { product: MobileProduct }) {
    const detailHref = mortgageProductApplyDetailHref(product.id);
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop';
    const [slide, setSlide] = React.useState(0);
    const price =
        product.propertyValue != null
            ? `NGN${product.propertyValue.toLocaleString('en-NG')}`
            : product.referenceNumber
              ? `Ref ${product.referenceNumber}`
              : '';

    return (
        <div className="overflow-hidden rounded-[24px] bg-white shadow-md border border-gray-100">
            <div
                className="relative h-[200px] w-full bg-gray-100"
                style={{
                    backgroundImage: `url(${product.image || DEFAULT_IMAGE})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--sf-button,#1E40AF)] shadow-sm">
                    By AG Mortgage
                </span>
            </div>
            <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold text-[var(--sf-ink,#1E1B4B)]">{product.name}</h3>
                    {price ? <span className="shrink-0 text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">{price}</span> : null}
                </div>
                <p className="mb-4 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
                    {product.description || 'Explore competitive rates and flexible repayment on this mortgage.'}
                </p>
                <div className="mb-4 flex gap-6 text-xs text-gray-700">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[var(--sf-primary,#2563EB)]" />
                        <span>{product.duration || '12 months'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Percent className="h-3.5 w-3.5 text-[var(--sf-primary,#2563EB)]" />
                        <span>{product.interestRate || '3% p.a'}</span>
                    </div>
                </div>
                <Link href={detailHref}>
                    <Button className="h-11 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
                        Get Started
                    </Button>
                </Link>
                <div className="mt-3 flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Highlight ${i + 1}`}
                            onClick={() => setSlide(i)}
                            className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-5 bg-[var(--sf-button,#1E40AF)]' : 'w-1.5 bg-gray-300')}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Mortgage Product Card ─────────────────────────────────────────────────────
export function MortgageProductCard({ product, compact }: { product: MobileProduct; compact?: boolean }) {
    const detailHref = mortgageProductApplyDetailHref(product.id);
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop';
    const imgH = compact ? 'h-[100px]' : 'h-[140px]';

    return (
        <div className="rounded-[20px] border border-gray-100 bg-white p-3 shadow-sm">
            <div
                className={cn('relative mb-3 w-full overflow-hidden rounded-[18px] bg-gray-100', imgH)}
                style={{ backgroundImage: `url(${product.image || DEFAULT_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="space-y-1.5 px-0.5">
                <h3 className={cn('font-bold text-[var(--sf-ink,#1E1B4B)]', compact ? 'line-clamp-2 text-xs' : 'text-sm')}>{product.name}</h3>
                {!compact && (
                    <p className="line-clamp-2 text-[10px] text-gray-500">{product.description}</p>
                )}
                {product.propertyValue != null && (
                    <div className="text-xs font-bold text-[var(--sf-ink,#1E1B4B)]">
                        NGN{product.propertyValue.toLocaleString('en-NG')}
                    </div>
                )}
                {product.interestRate && (
                    <div className="text-[10px] font-semibold text-[var(--sf-button,#1E40AF)]">{product.interestRate} p.a.</div>
                )}
                <Link href={detailHref}>
                    <Button
                        className={cn(
                            'mt-1 w-full rounded-full bg-[var(--sf-button,#1E40AF)] font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]',
                            compact ? 'h-9 text-[10px]' : 'h-10 text-xs',
                        )}
                    >
                        {compact ? 'View' : 'Get Started'}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Savings Product Card ──────────────────────────────────────────────────────
const SAVINGS_COLORS = [
    { bg: 'bg-purple-50', title: 'text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
    { bg: 'bg-blue-50', title: 'text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' },
    { bg: 'bg-green-50', title: 'text-green-700', btn: 'bg-green-600 hover:bg-green-700' },
    { bg: 'bg-orange-50', title: 'text-orange-700', btn: 'bg-orange-500 hover:bg-orange-600' },
];

export function SavingsProductCard({ product, index }: { product: MobileProduct; index: number }) {
    const color = SAVINGS_COLORS[index % SAVINGS_COLORS.length];
    const applyRoute = `${APPLY_ROUTES['Savings']}?productId=${product.id}`;

    return (
        <div className={`${color.bg} rounded-[24px] p-5 flex flex-col gap-3`}>
            <h3 className={`text-sm font-bold ${color.title}`}>{product.name}</h3>
            <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">{product.description}</p>
            {product.interestRate && (
                <span className="text-xs font-bold text-gray-800">{product.interestRate} p.a.</span>
            )}
            <Link href={applyRoute}>
                <Button className={`w-full h-9 rounded-full text-white text-xs font-semibold ${color.btn}`}>
                    Start Saving
                </Button>
            </Link>
        </div>
    );
}

// ─── Invest Product Card ───────────────────────────────────────────────────────
export function InvestProductCard({ product }: { product: MobileProduct }) {
    const detailHref = `/mobile-v2/products/invest/${encodeURIComponent(product.id)}`;
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop';

    return (
        <div className="bg-white rounded-[24px] p-3 shadow-sm border border-gray-100">
            <div
                className="relative w-full aspect-[4/3] rounded-[20px] mb-4 overflow-hidden bg-gray-100"
                style={{ backgroundImage: `url(${product.image || DEFAULT_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="px-1 space-y-2">
                <h3 className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)] line-clamp-2">{product.name}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-2">{product.description}</p>
                {product.duration ? (
                    <p className="text-[10px] font-medium text-gray-600">{product.duration}</p>
                ) : null}
                {product.interestRate ? (
                    <p className="text-xs font-bold text-[var(--sf-button,#1E40AF)]">
                        {product.interestRate.includes('%') ? product.interestRate : `${product.interestRate}%`} returns
                    </p>
                ) : null}
                <Link href={detailHref}>
                    <Button className="w-full h-10 rounded-full bg-[var(--sf-primary,#2563EB)] hover:bg-[var(--sf-primary,#2563EB)] text-white text-xs font-semibold mt-2">
                        View investment
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Commodity Product Card ────────────────────────────────────────────────────
export function CommodityProductCard({ product }: { product: MobileProduct }) {
    const applyRoute = `${APPLY_ROUTES['Commodity']}?productId=${product.id}`;
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=2070&auto=format&fit=crop';

    return (
        <div className="bg-white rounded-[24px] p-3 shadow-sm border border-gray-100">
            <div
                className="relative w-full aspect-square rounded-[20px] mb-4 overflow-hidden bg-gray-100"
                style={{ backgroundImage: `url(${product.image || DEFAULT_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="px-1 space-y-2">
                <h3 className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">{product.name}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-2">{product.description}</p>
                {product.price && (
                    <div className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">
                        ₦{product.price.toLocaleString()}
                        {product.unitOfMeasure && <span className="text-xs font-normal text-gray-500"> / {product.unitOfMeasure}</span>}
                    </div>
                )}
                <Link href={applyRoute}>
                    <Button className="w-full h-10 rounded-full bg-[var(--sf-primary,#2563EB)] hover:bg-[var(--sf-primary,#2563EB)] text-white text-xs font-semibold mt-2">
                        Buy Now
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Main product list component ───────────────────────────────────────────────
interface MobileV2ProductListProps {
    productType: 'Loan' | 'Mortgage' | 'Savings' | 'Commodity' | 'Invest';
}

export function MobileV2ProductList({ productType }: MobileV2ProductListProps) {
    const { appId: tenantAppId, ready: tenantReady, error: tenantError } = useMobileV2Tenant();
    const springAppId = tenantAppId ?? undefined;
    const { products, loading, error, getProductsByType } = useMobileProducts({
        springAppId: springAppId || undefined,
        autoFetch: true,
        tenantReady,
    });

    const filteredProducts = getProductsByType(productType);

    if (!tenantReady) return <LoadingState />;
    if (loading) return <LoadingState />;
    if (filteredProducts.length === 0)
        return (
            <EmptyState
                type={productType}
                fetchError={error}
                tenantAppId={springAppId ?? null}
                tenantError={tenantError}
            />
        );

    if (productType === 'Loan') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-[#1E293B]">Available Loans</h2>
                    <button className="px-3 py-1.5 bg-[var(--sf-button,#1E40AF)] text-white text-[10px] uppercase font-bold rounded-lg">
                        Check Eligibility
                    </button>
                </div>
                <div className="space-y-4">
                    {filteredProducts.map((product) => (
                        <LoanProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    }

    if (productType === 'Mortgage') {
        const [featured, ...hot] = filteredProducts;
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-[#1E293B]">Feature</h2>
                    <Link
                        href="/mobile-v2/products/mortgage/survey"
                        className="rounded-lg bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                    >
                        Check Eligibility
                    </Link>
                </div>
                {featured ? <FeaturedMortgageCard product={featured} /> : null}

                {hot.length > 0 ? (
                    <div>
                        <h2 className="mb-3 font-bold text-[#1E293B]">Hot Mortgage</h2>
                        <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 pl-1 pr-4 no-scrollbar">
                            {hot.map((p) => (
                                <div key={p.id} className="w-[200px] shrink-0">
                                    <MortgageProductCard product={p} compact />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    if (productType === 'Savings') {
        return (
            <div className="space-y-4">
                <h2 className="font-bold text-[#1E293B]">Savings Plans</h2>
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product, idx) => (
                        <SavingsProductCard key={product.id} product={product} index={idx} />
                    ))}
                </div>
            </div>
        );
    }

    if (productType === 'Commodity') {
        return (
            <div className="space-y-4">
                <h2 className="font-bold text-[#1E293B]">Available Commodities</h2>
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                        <CommodityProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    }

    if (productType === 'Invest') {
        return (
            <div className="space-y-4">
                <h2 className="font-bold text-[#1E293B]">Investment products</h2>
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                        <InvestProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        );
    }

    return <EmptyState type={productType} fetchError={error} tenantAppId={springAppId ?? null} tenantError={tenantError} />;
}
