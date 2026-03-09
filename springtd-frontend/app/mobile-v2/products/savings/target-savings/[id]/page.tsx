'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Home,
    User,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TargetDetailPage({ params }: { params: { id: string } }) {
    // In a real app, fetch data based on params.id
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedDebitOption, setSelectedDebitOption] = useState('wallet');

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

                {/* Header */}
                <div className="pt-12 px-6 mb-6 flex items-center">
                    <Link href="/mobile-v2/products/savings/target-savings" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="px-6 space-y-6">
                    {/* Header Card */}
                    <div className="bg-[#2563EB] rounded-[24px] p-8 text-center text-white shadow-lg shadow-blue-500/20">
                        <h2 className="text-3xl font-bold mb-2">₦30,000,000.00</h2>
                        <p className="text-base font-semibold mb-1">Save to Buy a Building</p>
                        <p className="text-[10px] text-blue-100 mb-6">Saving plan towards a 2 bedroom duplex</p>

                        <Button
                            onClick={() => setShowJoinModal(true)}
                            className="w-[180px] h-10 rounded-full bg-white hover:bg-gray-50 text-[#1E1B4B] text-xs font-bold"
                        >
                            Join Now
                        </Button>
                    </div>

                    {/* Metric Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#333333] rounded-[16px] h-14 flex items-center justify-center text-white text-[11px] font-medium">
                            Select Start date
                        </div>
                        <div className="bg-[#333333] rounded-[16px] h-14 flex items-center justify-center text-white text-[11px] font-medium">
                            Select Buying Date
                        </div>

                        <div className="bg-[#333333] rounded-[16px] h-[60px] flex flex-col items-center justify-center text-white">
                            <span className="text-[9px] text-gray-400 mb-0.5">Frequency</span>
                            <span className="text-[11px] font-bold">N500,000 Weekly</span>
                        </div>
                        <div className="bg-[#333333] rounded-[16px] h-[60px] flex flex-col items-center justify-center text-white">
                            <span className="text-[9px] text-gray-400 mb-0.5">Target</span>
                            <span className="text-[11px] font-bold">N30,000,000</span>
                        </div>
                    </div>

                    {/* Activities */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-[#1E293B]">Latest Activities</h3>
                            <button className="text-[10px] font-bold text-[#16A34A]">See all</button>
                        </div>

                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((_, idx) => (
                                <div key={idx} className="bg-white rounded-[20px] p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 mb-0.5">Receive</p>
                                        <p className="text-sm font-bold text-[#1E1B4B]">Charles Boss</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-[#16A34A]">N10,000.00</p>
                                        <p className="text-[10px] text-gray-400">12.00 pm</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Join Target Modal */}
            {showJoinModal && (
                <div className="absolute inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowJoinModal(false)}
                    />

                    {/* Bottom Sheet */}
                    <div className="relative bg-white w-full rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 z-10">
                        {/* Handle Bar */}
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />

                        <h2 className="text-xl font-bold text-[#166534] text-center mb-4">Join Target</h2>

                        <p className="text-sm text-gray-500 text-center mb-8 px-4 leading-relaxed">
                            This is a savings challenge to save N30,000,000. You earn interests, paid daily.
                        </p>

                        <div className="space-y-4 mb-8">
                            {[
                                { id: 'wallet', label: 'Debit Wallet' },
                                { id: 'card', label: 'Debit Card' },
                                { id: 'both', label: 'Debit Both' },
                            ].map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => setSelectedDebitOption(opt.id)}
                                    className="bg-[#E5E7EB] rounded-[16px] h-14 flex items-center px-4 cursor-pointer"
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-all",
                                        selectedDebitOption === opt.id ? "border-[#166534]" : "border-gray-400"
                                    )}>
                                        {selectedDebitOption === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#166534]" />}
                                    </div>
                                    <span className="text-sm text-gray-600 font-medium">{opt.label}</span>
                                </div>
                            ))}
                        </div>

                        <Button className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-xl shadow-blue-900/10">
                            Submit
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
