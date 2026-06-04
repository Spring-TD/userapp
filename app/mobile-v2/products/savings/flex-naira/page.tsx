'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductFundingFlowSheet } from '@/components/mobile-v2/application/ProductFundingFlowSheet';
import { MobileV2ProductListSkeleton } from '@/components/mobile-v2/data-skeletons';
import { useMobileProductDetail } from '@/hooks/useMobileProductDetail';
import { useMobileV2Tenant } from '@/contexts/MobileV2TenantContext';
import { amountRange, feeSummary, formatNgn, rateLabel } from '@/lib/mobileProductDetailDisplay';

export default function FlexNairaPage() {
    const searchParams = useSearchParams();
    const productId = searchParams.get('productId') || '';
    const { ready: tenantReady, displayName } = useMobileV2Tenant();
    const { product, loading } = useMobileProductDetail({
        productId,
        enabled: tenantReady && Boolean(productId),
    });
    const [isFundingFlowOpen, setIsFundingFlowOpen] = useState(false);
    if (productId && (!tenantReady || loading)) {
        return (
            <div className="flex h-full flex-col bg-[#F4F7FF] px-6 pt-12">
                <MobileV2ProductListSkeleton />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#F4F7FF] px-6 text-center">
                <p className="text-sm text-gray-600">This savings product could not be found.</p>
                <Link href="/mobile-v2/products/savings">
                    <Button className="rounded-full bg-[var(--sf-button,#1E40AF)] text-white">
                        Back to savings
                    </Button>
                </Link>
            </div>
        );
    }

    const title = product.name;
    const duration = product.duration || 'Not specified';
    const rate = rateLabel(product);
    const description = product.description || 'Savings product';
    const providerName = displayName || 'Provider';
    const amountRows =
        product.amountMin != null && product.amountMax != null
            ? [
                ['Minimum amount', formatNgn(product.amountMin)],
                ['Maximum amount', formatNgn(product.amountMax)],
            ]
            : [['Amount to save', amountRange(product)]];
    const details = [
        ['Name of savings', product.name],
        ['Purpose', product.subType || product.description || 'Savings plan'],
        ['Duration', duration],
        ['Frequency', product.withdrawalFlexibility || 'Not specified'],
        ...amountRows,
        ['Fees & charges', feeSummary(product)],
    ];

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-[#F4F7FF]">
            <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-8 pt-12">
                <Link
                    href="/mobile-v2/products/savings"
                    className="mb-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1E293B] shadow-sm"
                    aria-label="Back to savings"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>

                <section className="rounded-[8px] bg-[#262728] px-4 py-7 text-white">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <h1 className="text-[32px] font-bold leading-none text-[var(--sf-button,#2563EB)]">
                            {title}
                        </h1>
                        <span className="mt-1 shrink-0 rounded-full bg-white px-4 py-2 text-[10px] font-semibold text-gray-600">
                            By {providerName}
                        </span>
                    </div>
                    <p className="max-w-[270px] text-[13px] font-medium leading-relaxed text-white/90">
                        {description}
                    </p>
                </section>

                <section className="mt-7">
                    <div className="mb-4 flex items-start justify-between gap-4">
                        <h2 className="text-base font-medium text-[#4B5563]">{title}</h2>
                        <p className="shrink-0 text-sm font-bold text-[#1F2937]">Up to {rate} returns</p>
                    </div>

                    <p className="mb-5 text-[12px] leading-relaxed text-[#4B5563]">
                        {description}
                    </p>

                    <div className="mb-10 flex items-center gap-4 text-[13px] font-bold text-[#5F6368]">
                        <span className="inline-flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-300 text-white">
                                <CalendarDays className="h-3.5 w-3.5" />
                            </span>
                            {duration}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white">
                                <Percent className="h-3.5 w-3.5" />
                            </span>
                            {rate}
                        </span>
                    </div>

                    <div className="space-y-9">
                        {details.map(([label, value]) => {
                            const showDropdown = ['Frequency', 'Duration'].includes(label);

                            return (
                                <div key={label} className="flex items-center justify-between gap-6">
                                    <span className="text-base font-medium text-gray-500">{label}</span>
                                    <span className="inline-flex items-center gap-2 text-right text-base font-bold text-[#4B4F58]">
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
                productId={productId}
                accountKind="savings"
                productName={title}
                productKindLabel="savings"
                termsTitle="Create a Savings Account"
                termsDescription={
                    <>
                        Before you can proceed with <strong>{title}</strong> offered by{' '}
                        <strong>{providerName}</strong>, you are required to open a bank account with{' '}
                        <strong>{providerName}</strong>.
                    </>
                }
                providerName={providerName}
                formTitle="Start Flex Savings"
                namePlaceholder="Name of savings"
                amountPlaceholder="Amount to save"
                actionLabel="Start Saving"
                successTitle="Savings Started"
                successMessage="Your savings plan has been created successfully."
                failureMessage="Your central wallet balance is not sufficient for this savings amount. Please fund your wallet and try again."
            />
        </div>
    );
}
