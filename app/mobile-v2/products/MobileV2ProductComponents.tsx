'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Percent, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileProducts, MobileProduct } from '@/hooks/useMobileProducts';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { cn } from '@/lib/utils';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { loanApplyStartHref, loanProductApplyDetailHref } from '@/lib/loanApplyRoutes';
import { mortgageProductApplyDetailHref } from '@/lib/mortgageApplyRoutes';
import { amountRange, formatNgn, poweredBy, rateLabel } from '@/lib/mobileProductDetailDisplay';
import {
    blocksAnotherApplication,
    doesApplicationMatchProduct,
    fetchUserApplications,
    type StorefrontApplication,
} from '@/lib/storefrontApplicationClient';
import {
    availableStorefrontProductTypes,
    productImageBackgroundStyle,
    resolveProductDisplayImage,
    storefrontProductTypeRoute,
    type StorefrontProductType,
} from '@/lib/storefrontProducts';

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function MobileV2TabBar({ activeTab }: { activeTab: StorefrontProductType }) {
    const { appId: tenantAppId, ready: tenantReady } = useMobileV2Tenant();
    const { products, loading } = useMobileProducts({
        springAppId: tenantAppId ?? undefined,
        autoFetch: true,
        tenantReady,
    });
    const tabs = React.useMemo(
        () => availableStorefrontProductTypes(products),
        [products],
    );

    if (!tenantReady || loading) {
        return <div className="h-11 w-full animate-pulse rounded-full bg-[#F3F4F6]" />;
    }

    if (tabs.length === 0) return null;

    return (
        <div className="w-full bg-[#F3F4F6] p-1.5 rounded-full flex items-center justify-between overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
                <Link
                    key={tab}
                    href={storefrontProductTypeRoute(tab)}
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full sf-icon-tile-bg">
                <PackageOpen className="h-8 w-8 sf-icon-tile" />
            </div>
            <h3 className="mb-2 text-base font-bold text-[var(--sf-ink,#1E293B)]">No {type} products yet</h3>
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
export function LoanProductCard({ product, disabled }: { product: MobileProduct; disabled?: boolean }) {
    const detailRoute = loanProductApplyDetailHref(product.id);
    const amount = amountRange(product);
    const rate = rateLabel(product);

    return (
        <div className="bg-[var(--sf-ink,#1E1B4B)] rounded-[24px] p-5 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="flex flex-col mb-4">
                <span className="mb-1 block text-[10px] font-medium text-white/70">Loan Amount</span>
                <h2 className="text-xl font-bold tracking-tight">{amount}</h2>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/80">{product.name}</p>

                <div className="flex gap-4">
                    {product.duration && (
                        <div className="flex items-center gap-1.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                                <Calendar className="h-3.5 w-3.5 text-white/80" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="mb-0.5 text-[9px] text-white/60">Duration</span>
                                <span className="text-[11px] font-bold">{product.duration}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                            <Percent className="h-3.5 w-3.5 text-white/80" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="mb-0.5 text-[9px] text-white/60">Interest</span>
                            <span className="text-[11px] font-bold">{rate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {product.description && (
                <p className="text-[11px] text-white/70 mb-4 leading-relaxed font-light opacity-90 pr-2 line-clamp-2">
                    {product.description}
                </p>
            )}

            <div className="mt-auto flex items-center justify-end">
                <Link href={detailRoute}>
                    <Button className={cn(
                        'h-9 rounded-xl text-[11px] font-semibold px-4 shadow-lg',
                        disabled
                            ? 'bg-gray-400 text-white hover:bg-gray-400'
                            : 'sf-btn',
                    )}>
                        {disabled ? 'Already Applied' : 'Apply for Loan'}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Featured loan ───────────────────────────────────────────────────────────
export function FeaturedLoanProductCard({ product, disabled }: { product: MobileProduct; disabled?: boolean }) {
    const detailHref = loanProductApplyDetailHref(product.id);
    const { displayName } = useMobileV2Tenant();
    const [slide, setSlide] = React.useState(0);
    const loanAmount =
        product.amountMax != null
            ? formatNgn(product.amountMax).replace(/^NGN/, '')
            : product.amountMin != null
                ? formatNgn(product.amountMin).replace(/^NGN/, '')
                : amountRange(product).replaceAll('NGN', '');
    const provider = poweredBy(displayName || undefined);

    return (
        <div className="space-y-3">
            <div className="rounded-[18px] bg-[var(--sf-ink,#1E1B4B)] px-6 py-6 text-white shadow-md">
                <div className="flex items-start justify-between gap-5">
                    <div>
                        <h3 className="mb-2 max-w-[220px] truncate text-base font-bold leading-tight text-white">
                            {product.name || 'Loan Product'}
                        </h3>
                        <p className="mb-1 text-[11px] text-white/75">Loan Amount</p>
                        <p className="text-[32px] font-bold leading-none tracking-tight">{loanAmount}</p>
                    </div>
                    <div className="mt-5 flex shrink-0 items-start gap-5">
                        <div className="flex items-start gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-white/20">
                                <Calendar className="h-2.5 w-2.5 text-white/90" />
                            </span>
                            <div className="leading-none">
                                <p className="text-[7px] font-semibold text-white/65">Duration</p>
                                <p className="mt-1 text-[9px] font-bold text-white">{product.duration || '12 months'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                                <Percent className="h-2.5 w-2.5 text-white/90" />
                            </span>
                            <div className="leading-none">
                                <p className="text-[7px] font-semibold text-white/65">Interest</p>
                                <p className="mt-1 text-[9px] font-bold text-white">{rateLabel(product)} p.a</p>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="mt-7 max-w-[330px] text-[15px] leading-snug text-white/95">
                    {product.description || 'Explore competitive rates and flexible repayment on this loan.'}
                </p>

                <div className="mt-9 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-bold text-yellow-300">
                            {provider.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="truncate text-sm font-bold text-white">{provider}</p>
                    </div>
                    <Link href={detailHref}>
                        <Button className={cn(
                            'h-10 rounded-lg px-5 text-xs font-semibold text-white',
                            disabled
                                ? 'bg-gray-400 hover:bg-gray-400'
                                : 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)]',
                        )}>
                            {disabled ? 'Already Applied' : 'Apply for Loan'}
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={`Loan highlight ${i + 1}`}
                        onClick={() => setSlide(i)}
                        className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-8 bg-[var(--sf-primary,#2563EB)]' : 'w-4 bg-gray-400')}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Loan Product Card ───────────────────────────────────────────────────────
export function HotLoanProductCard({ product, compact, disabled }: { product: MobileProduct; compact?: boolean; disabled?: boolean }) {
    const detailHref = loanProductApplyDetailHref(product.id);
    const imageStyle = productImageBackgroundStyle(resolveProductDisplayImage(product));
    const imgH = compact ? 'h-[100px]' : 'h-[140px]';

    return (
        <div className={cn('min-w-0 overflow-hidden border border-gray-100 bg-white shadow-sm', compact ? 'rounded-[18px] p-2.5' : 'rounded-[20px] p-3')}>
            <div
                className={cn('relative mb-3 w-full overflow-hidden rounded-[18px] bg-gray-100', imgH)}
                style={imageStyle}
            />
            <div className="min-w-0 space-y-1.5 px-0.5">
                <h3 className={cn('break-words font-bold text-[var(--sf-ink,#1E1B4B)]', compact ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm')}>{product.name}</h3>
                {!compact && (
                    <p className="line-clamp-2 text-[10px] text-gray-500">{product.description}</p>
                )}
                <div className={cn('font-bold text-[var(--sf-ink,#1E1B4B)]', compact ? 'break-words text-[11px] leading-tight' : 'text-xs')}>
                    {amountRange(product)}
                </div>
                <div className="text-[10px] font-semibold text-[var(--sf-button,#1E40AF)]">{rateLabel(product)}</div>
                <Link href={detailHref}>
                    <Button
                        className={cn(
                            'mt-1 w-full rounded-full font-semibold text-white',
                            disabled
                                ? 'bg-gray-400 hover:bg-gray-400'
                                : 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)]',
                            compact ? 'h-9 text-[10px]' : 'h-10 text-xs',
                        )}
                    >
                        {disabled ? 'Already Applied' : compact ? 'View' : 'Get Started'}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Featured mortgage (carousel dots + Get Started → detail) ───────────────
export function FeaturedMortgageCard({ product, disabled }: { product: MobileProduct; disabled?: boolean }) {
    const detailHref = mortgageProductApplyDetailHref(product.id);
    const { displayName } = useMobileV2Tenant();
    const imageStyle = productImageBackgroundStyle(resolveProductDisplayImage(product));
    const [slide, setSlide] = React.useState(0);
    const price = amountRange(product);
    const provider = poweredBy(displayName || undefined);

    return (
        <div className="overflow-hidden rounded-[24px] bg-white shadow-md border border-gray-100">
            <div
                className="relative h-[200px] w-full bg-gray-100"
                style={imageStyle}
            >
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--sf-button,#1E40AF)] shadow-sm">
                    By {provider}
                </span>
            </div>
            <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-base font-bold text-[var(--sf-ink,#1E1B4B)]">{product.name}</h3>
                    <span className="shrink-0 text-right text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">{price}</span>
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
                        <span>{rateLabel(product)}</span>
                    </div>
                </div>
                <Link href={detailHref}>
                    <Button className={cn(
                        'h-11 w-full rounded-full text-sm font-semibold text-white',
                        disabled
                            ? 'bg-gray-400 hover:bg-gray-400'
                            : 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)]',
                    )}>
                        {disabled ? 'Already Applied' : 'Get Started'}
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
export function MortgageProductCard({ product, compact, disabled }: { product: MobileProduct; compact?: boolean; disabled?: boolean }) {
    const detailHref = mortgageProductApplyDetailHref(product.id);
    const imageStyle = productImageBackgroundStyle(resolveProductDisplayImage(product));
    const imgH = compact ? 'h-[100px]' : 'h-[140px]';

    return (
        <div className={cn('min-w-0 overflow-hidden border border-gray-100 bg-white shadow-sm', compact ? 'rounded-[18px] p-2.5' : 'rounded-[20px] p-3')}>
            <div
                className={cn('relative mb-3 w-full overflow-hidden rounded-[18px] bg-gray-100', imgH)}
                style={imageStyle}
            />
            <div className="min-w-0 space-y-1.5 px-0.5">
                <h3 className={cn('break-words font-bold text-[var(--sf-ink,#1E1B4B)]', compact ? 'line-clamp-2 text-xs' : 'line-clamp-2 text-sm')}>{product.name}</h3>
                {!compact && (
                    <p className="line-clamp-2 text-[10px] text-gray-500">{product.description}</p>
                )}
                <div className={cn('font-bold text-[var(--sf-ink,#1E1B4B)]', compact ? 'break-words text-[11px] leading-tight' : 'text-xs')}>
                    {amountRange(product)}
                </div>
                <div className="text-[10px] font-semibold text-[var(--sf-button,#1E40AF)]">{rateLabel(product)}</div>
                <Link href={detailHref}>
                    <Button
                        className={cn(
                            'mt-1 w-full rounded-full font-semibold text-white',
                            disabled
                                ? 'bg-gray-400 hover:bg-gray-400'
                                : 'bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)]',
                            compact ? 'h-9 text-[10px]' : 'h-10 text-xs',
                        )}
                    >
                        {disabled ? 'Already Applied' : compact ? 'View' : 'Get Started'}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Savings Product Card ──────────────────────────────────────────────────────
/** Brand-tinted savings cards (no hardcoded rainbow palette). */
const SAVINGS_TONES = [
    { bg: 'sf-accent-soft', title: 'sf-text-button' },
    { bg: 'sf-bg-tint', title: 'sf-text-primary' },
    { bg: 'sf-page-bg-tint', title: 'sf-text-ink' },
    { bg: 'sf-accent-soft', title: 'sf-text-button' },
];

export function SavingsProductCard({ product, index }: { product: MobileProduct; index: number }) {
    const tone = SAVINGS_TONES[index % SAVINGS_TONES.length];
    const detailHref = `/mobile-v2/products/savings/flex-naira?productId=${encodeURIComponent(product.id)}`;

    return (
        <div className={`${tone.bg} flex min-w-0 flex-col gap-3 overflow-hidden rounded-[24px] p-5`}>
            <h3 className={`line-clamp-2 break-words text-sm font-bold leading-tight ${tone.title}`}>{product.name}</h3>
            <p className="line-clamp-3 flex-1 break-words text-xs leading-relaxed text-gray-500">{product.description}</p>
            <span className="text-xs font-bold text-gray-800">{amountRange(product)}</span>
            <span className="text-[11px] font-semibold text-gray-600">
                {rateLabel(product)}{product.duration ? ` · ${product.duration}` : ''}
            </span>
            <Link href={detailHref}>
                <Button className="sf-btn h-9 w-full rounded-full text-xs font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
                    Start Saving
                </Button>
            </Link>
        </div>
    );
}

// ─── Invest Product Card ───────────────────────────────────────────────────────
export function InvestProductCard({ product }: { product: MobileProduct }) {
    const detailHref = `/mobile-v2/products/invest/${encodeURIComponent(product.id)}`;
    const imageStyle = productImageBackgroundStyle(resolveProductDisplayImage(product));

    return (
        <div className="min-w-0 overflow-hidden rounded-[18px] border border-gray-100 bg-white p-2.5 shadow-sm">
            <div
                className="relative mb-2 h-[76px] w-full overflow-hidden rounded-[14px] bg-gray-100"
                style={imageStyle}
            />
            <div className="min-w-0 space-y-1.5 px-0.5">
                <h3 className="line-clamp-2 break-words text-[12px] font-bold leading-snug text-[var(--sf-ink,#1E1B4B)]">{product.name}</h3>
                {/* <p className="line-clamp-2 text-[9px] leading-snug text-gray-500">{product.description}</p> */}
                {product.duration ? (
                    <p className="text-[9px] font-medium text-gray-600">{product.duration}</p>
                ) : null}
                <p className="line-clamp-2 text-[10px] font-bold leading-tight text-[var(--sf-ink,#1E1B4B)]">{amountRange(product)}</p>
                <p className="text-[10px] font-bold text-[var(--sf-button,#1E40AF)]">{rateLabel(product)} returns</p>
                <Link href={detailHref}>
                    <Button className="mt-1 h-8 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-[10px] font-semibold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]">
                        View investment
                    </Button>
                </Link>
            </div>
        </div>
    );
}

// ─── Commodity Product Card ────────────────────────────────────────────────────
export function CommodityProductCard({ product }: { product: MobileProduct }) {
    const detailRoute = `/mobile-v2/products/commodity/${encodeURIComponent(product.id)}`;
    const imageStyle = productImageBackgroundStyle(resolveProductDisplayImage(product));

    return (
        <div className="bg-white rounded-[18px] p-2.5 shadow-sm border border-gray-100">
            <div
                className="relative mb-2 h-[76px] w-full overflow-hidden rounded-[14px] bg-gray-100"
                style={imageStyle}
            />
            <div className="min-w-0 space-y-1.5 px-0.5">
                <h3 className="line-clamp-2 break-words text-[12px] font-bold leading-snug text-[var(--sf-ink,#1E1B4B)]">{product.name}</h3>
                <p className="line-clamp-1 text-[9px] leading-snug text-gray-500">{product.description}</p>
                <div className="line-clamp-2 text-[10px] font-bold leading-tight text-[var(--sf-ink,#1E1B4B)]">
                    {amountRange(product)}
                    {product.minimumQuantity ? (
                        <span className="block text-[9px] font-normal text-gray-500">
                            Min quantity: {product.minimumQuantity.toLocaleString()}
                        </span>
                    ) : null}
                </div>
                <Link href={detailRoute}>
                    <Button className="mt-1 h-8 w-full rounded-full bg-[var(--sf-primary,#2563EB)] text-[10px] font-semibold text-white hover:bg-[var(--sf-primary,#2563EB)]">
                        View commodity
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
    const { loading, error, getProductsByType } = useMobileProducts({
        springAppId: springAppId || undefined,
        autoFetch: true,
        tenantReady,
    });
    const [applications, setApplications] = React.useState<StorefrontApplication[]>([]);

    React.useEffect(() => {
        if (!tenantReady || !['Loan', 'Mortgage'].includes(productType)) {
            setApplications([]);
            return;
        }
        let cancelled = false;
        void fetchUserApplications(undefined, {
            productType: productType.toUpperCase(),
            fetchAllPages: true,
        }).then((result) => {
            if (cancelled) return;
            setApplications(result.ok ? result.applications : []);
        });
        return () => {
            cancelled = true;
        };
    }, [productType, tenantReady]);

    const filteredProducts = getProductsByType(productType).sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
    );
    const isBlocked = (productId: string) =>
        applications.some(
            (application) =>
                doesApplicationMatchProduct(application, productId) &&
                blocksAnotherApplication(application),
        );

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
        const featured = filteredProducts.find((product) => product.isFeatured) ?? filteredProducts[0];
        const hot = filteredProducts.filter((product) => product.id !== featured?.id);
        const featuredCtaProduct = filteredProducts.find((product) => !isBlocked(product.id)) ?? null;
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-[#1E293B]">Feature</h2>
                    {featuredCtaProduct ? (
                        <Link
                            href={loanApplyStartHref(featuredCtaProduct.id)}
                            className="rounded-lg bg-[var(--sf-button,#1E40AF)] px-3 py-1.5 text-[10px] font-bold uppercase text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                        >
                            Check Eligibility
                        </Link>
                    ) : (
                        <span className="rounded-lg bg-gray-200 px-3 py-1.5 text-[10px] font-bold uppercase text-gray-500">
                            Already Applied
                        </span>
                    )}
                </div>
                {featured ? <FeaturedLoanProductCard product={featured} disabled={isBlocked(featured.id)} /> : null}

                {hot.length > 0 ? (
                    <div>
                        <h2 className="mb-3 font-bold text-[#1E293B]">Hot Loan</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {hot.map((p) => (
                                <div key={p.id} className="min-w-0">
                                    <HotLoanProductCard product={p} compact disabled={isBlocked(p.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    if (productType === 'Mortgage') {
        const featured = filteredProducts.find((product) => product.isFeatured) ?? filteredProducts[0];
        const hot = filteredProducts.filter((product) => product.id !== featured?.id);
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
                {featured ? <FeaturedMortgageCard product={featured} disabled={isBlocked(featured.id)} /> : null}

                {hot.length > 0 ? (
                    <div>
                        <h2 className="mb-3 font-bold text-[#1E293B]">Hot Mortgage</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {hot.map((p) => (
                                <div key={p.id} className="min-w-0">
                                    <MortgageProductCard product={p} compact disabled={isBlocked(p.id)} />
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
