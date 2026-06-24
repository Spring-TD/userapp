'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ChevronLeft,
    CalendarDays,
    Percent,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { ProductFundingFlowSheet } from '@/components/mobile-v2/application/ProductFundingFlowSheet';
import { amountRange, feeSummary, formatNgn, rateLabel } from '@/lib/mobileProductDetailDisplay';

export default function InvestDetailPage() {
    const params = useParams();
    const rawId = params?.id;
    const productId = typeof rawId === 'string' ? decodeURIComponent(rawId) : '';
    const { ready: tenantReady, displayName } = useMobileV2Tenant();
    const { product, loading } = useMobileProductDetail({
        productId,
        enabled: tenantReady && Boolean(productId),
    });

    const [isFundingFlowOpen, setIsFundingFlowOpen] = useState(false);

    const amountValue = product?.propertyValue ?? product?.price;
    const amountRows =
        product?.amountMin != null && product?.amountMax != null
            ? [
                ['Minimum amount', formatNgn(product.amountMin)],
                ['Maximum amount', formatNgn(product.amountMax)],
            ]
            : [
                [
                    'Amount to invest',
                    product ? amountRange(product) : amountValue != null ? `NGN${amountValue.toLocaleString('en-NG')}` : 'Flexible amount',
                ],
            ];
    const returnDisplay = product ? `${rateLabel(product)} returns` : 'Returns available';
    const durationDisplay = product?.duration || 'Flexible duration';
    const providerName = displayName || 'Provider';

    const investmentDetails = useMemo(
        () => [
            ['Name of investment', product?.name || 'Investment Product'],
            ['Purpose', product?.subType || 'Wealth growth'],
            ['Duration', durationDisplay],
            ['Frequency', 'Monthly'],
            ...amountRows,
            ['Fees & charges', product ? feeSummary(product) : 'Nil'],
        ],
        [amountRows, durationDisplay, product, product?.name, product?.subType],
    );

    if (!tenantReady || loading) {
        return (
            <div className="flex h-full flex-col sf-page-bg px-6 pt-12">
                <MobileV2ProductListSkeleton />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 sf-page-bg px-6 text-center">
                <p className="text-sm text-gray-600">This investment product could not be found.</p>
                <Link href="/mobile-v2/products/invest">
                    <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
                        Back to investments
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-[color-mix(in_srgb,var(--sf-button,#2563EB)_6%,white)]">
            <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-8 pt-12">
                <Link
                    href="/mobile-v2/products/invest"
                    className="mb-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--sf-ink,#1E293B)] shadow-sm"
                    aria-label="Back to investments"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>

                <section className="rounded-[16px] bg-[var(--sf-ink,#1E1B4B)] px-4 py-7 text-white shadow-sm">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <h1 className="text-[32px] font-bold leading-none text-white">
                            {product.name}
                        </h1>
                        <span className="mt-1 shrink-0 rounded-full bg-white/95 px-4 py-2 text-[10px] font-semibold text-[var(--sf-ink,#1E293B)]">
                            By {providerName}
                        </span>
                    </div>
                    <p className="max-w-[270px] text-[13px] font-medium leading-relaxed text-white/90">
                        {product.description || 'Investment product designed to help you grow your wealth.'}
                    </p>
                </section>

                <section className="mt-7">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 className="text-base font-medium text-[var(--sf-ink,#1E293B)]">{product.name}</h2>
                        <p className="shrink-0 text-sm font-bold text-[var(--sf-button,#2563EB)]">{returnDisplay}</p>
                    </div>

                    <p className="mb-5 text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--sf-ink,#1E293B)_80%,white)]">
                        {product.description || 'Review this investment and continue when you are ready to proceed.'}
                    </p>

                    <div className="mb-10 flex items-center gap-4 text-[13px] font-bold text-[var(--sf-ink,#1E293B)]">
                        <span className="inline-flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--sf-button,#2563EB)] text-white">
                                <CalendarDays className="h-3.5 w-3.5" />
                            </span>
                            {durationDisplay}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--sf-button,#2563EB)] text-white">
                                <Percent className="h-3.5 w-3.5" />
                            </span>
                            {returnDisplay}
                        </span>
                    </div>

                    <div className="space-y-9">
                        {investmentDetails.map(([label, value]) => {
                            const showDropdown = ['Frequency', 'Duration'].includes(label);

                            return (
                                <div key={label} className="flex items-center justify-between gap-6">
                                    <span className="text-base font-medium text-gray-500">{label}</span>
                                    <span className="inline-flex items-center gap-2 text-right text-base font-bold text-[var(--sf-ink,#1E293B)]">
                                        {value}
                                        {showDropdown ? <ChevronDown className="h-4 w-4 text-[#4B4F58]" /> : null}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <Button
                        onClick={() => setIsFundingFlowOpen(true)}
                        className="mt-7 h-12 w-full rounded-full bg-[var(--sf-button,#2563EB)] text-sm font-bold text-white hover:bg-[var(--sf-button-hover,#1e3a8a)]"
                    >
                        Continue
                    </Button>
                </section>
            </div>

            <ProductFundingFlowSheet
                open={isFundingFlowOpen}
                onClose={() => setIsFundingFlowOpen(false)}
                productId={product.id}
                accountKind="investment"
                productName={product.name}
                productKindLabel="investment"
                termsTitle="Create an Investment Account"
                termsDescription={
                    <>
                        Before you can proceed with <strong>{product.name}</strong> offered by{' '}
                        <strong>{providerName}</strong>, you are required to open a bank account with{' '}
                        <strong>{providerName}</strong>.
                    </>
                }
                providerName={providerName}
                formTitle="Start Investment"
                namePlaceholder="Name of investment"
                amountPlaceholder="Amount to invest"
                actionLabel="Start Investing"
                successTitle="Investment Started"
                successMessage="Your investment has been created successfully."
                failureMessage="Your central wallet balance is not sufficient for this investment amount. Please fund your wallet and try again."
                amountMin={product.amountMin}
                amountMax={product.amountMax}
            />
        </div>
    );
}
