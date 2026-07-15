'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileV2BottomNav } from '@/components/mobile-v2/MobileV2BottomNav';
import { mortgageApplyStartHref } from '@/lib/mortgageApplyRoutes';
import { sanitizeProductId } from '@/lib/sanitizeProductId';

function TargetSavingsContent() {
    const searchParams = useSearchParams();
    const fromMortgage = searchParams.get('from') === 'mortgage';
    const mortgageProductId = sanitizeProductId(searchParams.get('productId'));
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    // Mock data for target savings
    const targets = [
        { id: 1, title: 'Save to a buy Building', amount: 'N30M', image: '/target-building.jpg' },
        { id: 2, title: 'Save to buy a Car', amount: 'N30M', image: '/target-car.jpg' },
        { id: 3, title: 'Save To a Buy Building', amount: 'N30M', image: '/target-building.jpg' },
        { id: 4, title: 'Save To buy a Car', amount: 'N30M', image: '/target-car.jpg' },
    ];

    return (
        <div className="relative flex h-full min-h-0 flex-col sf-page-bg">
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pb-32">

                {/* Header */}
                <div className="pt-12 px-6 mb-6 flex items-center">
                    <Link href="/mobile-v2/products/savings" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="px-6 space-y-6">
                    {fromMortgage && mortgageProductId ? (
                        <div className="rounded-[20px] border sf-border-brand sf-accent-soft p-5">
                            <h3 className="text-sm font-bold text-[var(--sf-ink,#1E1B4B)]">Mortgage down payment savings</h3>
                            <p className="mt-2 text-xs leading-relaxed text-gray-600">
                                Build your down payment with AGMB Target Savings. When you are ready, continue your mortgage application.
                            </p>
                            <Link href={mortgageApplyStartHref(mortgageProductId)} className="mt-4 block">
                                <Button className="h-11 w-full rounded-full bg-[var(--sf-button,#1E40AF)] text-sm font-semibold text-white">
                                    Continue mortgage application
                                </Button>
                            </Link>
                        </div>
                    ) : null}

                    {/* Balance Card */}
                    <div className="bg-[var(--sf-button,#1E40AF)] rounded-[24px] p-6 text-center text-white relative overflow-hidden">
                        <p className="text-sm font-medium mb-1 text-blue-100">Target Saving Balance</p>
                        <h2 className="text-3xl font-bold mb-6">₦500,039.12</h2>

                        <div className="flex justify-center items-center gap-4">
                            <div className="bg-white text-[var(--sf-button,#1E40AF)] text-[10px] font-bold px-3 py-1.5 rounded-lg">
                                12% per annum
                            </div>
                            <div className="bg-white text-[var(--sf-button,#1E40AF)] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                AG BANK: 1234567890
                            </div>
                        </div>
                    </div>

                    {/* Info Banner */}
                    {showInfoBanner && (
                        <div className="bg-[var(--sf-tint,#E0E7FF)] rounded-[20px] p-5 relative">
                            <button
                                onClick={() => setShowInfoBanner(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-xs font-bold text-[var(--sf-ink,#1E1B4B)] mb-3">What is new on Target Savings?</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-2 text-[10px] text-gray-600 leading-relaxed">
                                    <span className="text-gray-400">•</span>
                                    Click Add Money to generate a PocketApp account number. It is the fastest and most reliable way to fund your Flex Naira wallet
                                </li>
                                <li className="flex gap-2 text-[10px] text-gray-600 leading-relaxed">
                                    <span className="text-gray-400">•</span>
                                    Search for PocketApp on your bank app and enter your new PocketApp account number
                                </li>
                                <li className="flex gap-2 text-[10px] text-gray-600 leading-relaxed">
                                    <span className="text-gray-400">•</span>
                                    Send funds and it'll be credited to your Flex Naira wallet in seconds
                                </li>
                            </ul>
                        </div>
                    )}

                    {/* Targets Grid */}
                    <div className="space-y-4">
                        {targets.map((target, index) => (
                            <Link href={`/mobile-v2/products/savings/target-savings/${target.id}`} key={index}>
                                <div className="mb-4 group">
                                    <div className="relative w-full h-[140px] rounded-[20px] overflow-hidden mb-2 bg-gray-200">
                                        {/* Badge */}
                                        <div className="absolute top-3 right-3 bg-[#16A34A] text-white text-[10px] font-bold px-2 py-1 rounded-md z-10">
                                            {target.amount}
                                        </div>
                                        <Image
                                            src={target.image}
                                            alt={target.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <h3 className="text-sm font-semibold text-[var(--sf-ink,#1E1B4B)]">{target.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Nav */}
            <MobileV2BottomNav active="products" />
        </div>
    );
}

export default function TargetSavingsPage() {
    return (
        <Suspense fallback={null}>
            <TargetSavingsContent />
        </Suspense>
    );
}
