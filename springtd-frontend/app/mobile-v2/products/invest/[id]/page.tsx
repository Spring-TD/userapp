'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ChevronLeft,
    Calendar,
    Percent,
    Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function InvestDetailPage({ params }: { params: { id: string } }) {
    const [purchaseStep, setPurchaseStep] = useState<'details' | 'pin' | 'success'>('details');
    const [pin, setPin] = useState(['', '', '', '']);

    const handleCreatePin = (value: string, index: number) => {
        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
    };

    if (purchaseStep === 'success') {
        return (
            <div className="flex flex-col h-full bg-[#FAFAFA] relative items-center justify-center p-6">
                <div className="bg-white rounded-[30px] p-8 flex flex-col items-center shadow-lg w-full max-w-[320px]">
                    <div className="w-24 h-24 relative mb-6">
                        <Image
                            src="/success-check.png"
                            alt="Success"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <h2 className="text-lg font-bold text-[#1E293B] text-center mb-1">Payment Done Successfully</h2>

                    <Link href="/mobile-v2/products/invest" className="w-full mt-8">
                        <Button className="w-full h-12 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold">
                            Done
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (purchaseStep === 'pin') {
        return (
            <div className="flex flex-col h-full bg-[#FAFAFA] relative">
                <div className="pt-12 px-6 mb-8">
                    <button onClick={() => setPurchaseStep('details')} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center px-8">
                    <h2 className="text-lg font-medium text-[#1E293B] mb-12">Enter your transaction pin</h2>

                    <div className="flex gap-4 mb-12">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-xl font-bold text-[#1E1B4B]">
                                {pin[i] ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    <Button
                        onClick={() => setPurchaseStep('success')}
                        className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-xl shadow-blue-900/10 mb-8"
                    >
                        Pay Now
                    </Button>

                    {/* Numeric Keypad Simulation */}
                    <div className="w-full grid grid-cols-3 gap-2 mt-auto pb-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (typeof key === 'number') {
                                        const nextIndex = pin.findIndex(p => p === '');
                                        if (nextIndex !== -1) handleCreatePin(key.toString(), nextIndex);
                                    } else if (key === 'del') {
                                        // Logic to delete last digit
                                        const lastIndex = pin.findLastIndex(p => p !== '');
                                        if (lastIndex !== -1) handleCreatePin('', lastIndex);
                                    }
                                }}
                                className={cn(
                                    "h-14 rounded-lg flex flex-col items-center justify-center bg-white shadow-sm active:bg-gray-50",
                                    key === '' ? "invisible" : ""
                                )}
                            >
                                {key === 'del' ? '⌫' : (
                                    <>
                                        <span className="text-xl font-medium text-[#1E293B]">{key}</span>
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="pt-12 px-6 mb-6 flex items-center">
                    <Link href="/mobile-v2/products/invest" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="px-6 space-y-6">
                    {/* Main Card */}
                    <div className="bg-white rounded-[24px] p-0 shadow-sm overflow-hidden">
                        <div className="relative w-full h-[200px] bg-gray-200">
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-700 z-10">
                                By AG Mortgage
                            </div>
                            <Image
                                src="/commodity-maize.jpg"
                                alt="Maize Investment"
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <h2 className="text-base font-bold text-[#1E293B]">Maize Investment....</h2>
                                <span className="text-base font-bold text-[#1E1B4B]">NGN60,000,000</span>
                            </div>

                            <p className="text-xs text-gray-500 leading-relaxed">
                                Lorem ipsum dolor sit amet consectetur. Malesuada volutpat risus adipiscing nunc amet dolor eu fermentum. Sollicitu...
                            </p>

                            <div className="flex gap-6 pb-2 border-b border-gray-100">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-xs font-medium">06 months</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Percent className="w-4 h-4" />
                                    <span className="text-xs font-medium">3% ROI</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Payment Details */}
                    <div>
                        <h3 className="font-bold text-[#1E293B] mb-4">Order Payment Details</h3>

                        <div className="bg-white rounded-[24px] p-6 space-y-4 shadow-sm">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Order Amounts</span>
                                <span className="font-bold text-[#1E1B4B]">N16M</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Convenience</span>
                                    <span className="text-[10px] text-blue-500 font-medium">Know More</span>
                                </div>
                                <button className="text-[10px] text-blue-600 font-bold">Apply Coupon</button>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Delivery Fee</span>
                                <span className="font-bold text-blue-600 text-xs">Free</span>
                            </div>

                            <div className="border-t border-gray-100 my-2" />

                            <div className="flex justify-between items-center text-base">
                                <span className="font-bold text-[#1E293B]">Order Total</span>
                                <span className="font-bold text-[#1E1B4B]">N16M</span>
                            </div>

                            <Button
                                onClick={() => setPurchaseStep('pin')}
                                className="w-full h-12 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold mt-4"
                            >
                                Invest
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
