'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Percent, Loader2, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileProducts, MobileProduct } from '@/hooks/useMobileProducts';
import { cn } from '@/lib/utils';

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
                            ? 'bg-white text-[#1E40AF] shadow-sm'
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
function EmptyState({ type }: { type: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <PackageOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-[#1E293B] mb-2">No {type} Products Available</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
                No {type.toLowerCase()} products are available from your financial institution yet. Check back soon.
            </p>
        </div>
    );
}

// ─── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E40AF]" />
            <p className="text-sm text-gray-500">Loading products...</p>
        </div>
    );
}

// ─── Loan Product Card ────────────────────────────────────────────────────────
export function LoanProductCard({ product }: { product: MobileProduct }) {
    const applyRoute = `${APPLY_ROUTES['Loan']}?productId=${product.id}`;

    return (
        <div className="bg-[#1E1B4B] rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
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
                <Link href={applyRoute}>
                    <Button className="h-9 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[11px] font-semibold px-4 shadow-lg shadow-blue-500/20">
                        Apply for Loan
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Mortgage Product Card ─────────────────────────────────────────────────────
export function MortgageProductCard({ product }: { product: MobileProduct }) {
    const applyRoute = `${APPLY_ROUTES['Mortgage']}?productId=${product.id}`;
    const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop';

    return (
        <div className="bg-white rounded-[24px] p-3 shadow-sm border border-gray-100">
            <div
                className="relative w-full h-[140px] rounded-[20px] mb-4 overflow-hidden bg-gray-100"
                style={{ backgroundImage: `url(${product.image || DEFAULT_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="px-1 space-y-2">
                <h3 className="text-sm font-bold text-[#1E1B4B]">{product.name}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-2">{product.description}</p>
                {product.interestRate && (
                    <div className="text-xs font-semibold text-[#1E40AF]">{product.interestRate} p.a.</div>
                )}
                <Link href={applyRoute}>
                    <Button className="w-full h-10 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold mt-2">
                        Apply for Mortgage
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
                <h3 className="text-sm font-bold text-[#1E1B4B]">{product.name}</h3>
                <p className="text-[10px] text-gray-500 line-clamp-2">{product.description}</p>
                {product.price && (
                    <div className="text-sm font-bold text-[#1E1B4B]">
                        ₦{product.price.toLocaleString()}
                        {product.unitOfMeasure && <span className="text-xs font-normal text-gray-500"> / {product.unitOfMeasure}</span>}
                    </div>
                )}
                <Link href={applyRoute}>
                    <Button className="w-full h-10 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-semibold mt-2">
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
    const springAppId = process.env.NEXT_PUBLIC_SPRING_APP_ID;
    const { products, loading, error, getProductsByType } = useMobileProducts({
        springAppId,
        autoFetch: true,
    });

    const filteredProducts = getProductsByType(productType);

    if (loading) return <LoadingState />;
    if (filteredProducts.length === 0) return <EmptyState type={productType} />;

    if (productType === 'Loan') {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-[#1E293B]">Available Loans</h2>
                    <button className="px-3 py-1.5 bg-[#1E40AF] text-white text-[10px] uppercase font-bold rounded-lg">
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
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-[#1E293B]">Available Mortgages</h2>
                    <button className="px-3 py-1.5 bg-[#1E40AF] text-white text-[10px] uppercase font-bold rounded-lg">
                        Check Eligibility
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {filteredProducts.map((product) => (
                        <MortgageProductCard key={product.id} product={product} />
                    ))}
                </div>
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

    // Invest — show empty state (no special layout yet)
    return <EmptyState type={productType} />;
}
