'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    X,
    Home,
    User,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FlexNairaPage() {
    const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">

                {/* Header */}
                <div className="pt-12 px-6 mb-6 flex items-center">
                    <Link href="/mobile-v2/products/savings" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="px-6 space-y-6">
                    {/* Balance Card */}
                    <div className="bg-[#BFDBFE] rounded-[24px] p-6 text-center text-[#1E1B4B] relative overflow-hidden">
                        <p className="text-sm font-medium mb-1">Flex Naira Balance</p>
                        <h2 className="text-3xl font-bold mb-6">₦500,039.12</h2>

                        <div className="flex justify-between items-center gap-4">
                            <div className="bg-[#1E3A8A] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                                12% per annum
                            </div>
                            <div className="bg-[#1E3A8A] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                AG BANK: 1234567890
                            </div>
                        </div>
                    </div>

                    {/* Info Banner - Moved Up */}
                    {showInfoBanner && (
                        <div className="bg-[#E0E7FF] rounded-[20px] p-5 relative">
                            <button
                                onClick={() => setShowInfoBanner(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-xs font-bold text-[#1E1B4B] mb-3">What is new on Flex Naira?</h3>
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

                    {/* Action Buttons - Moved Down */}
                    <div className="flex gap-4">
                        <Button
                            onClick={() => setShowAddMoneyModal(true)}
                            className="flex-1 h-12 rounded-full bg-[#1E1B1B] hover:bg-black text-white font-semibold text-sm shadow-md"
                        >
                            Add Money
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-full bg-white hover:bg-gray-50 text-[#1E1B1B] font-semibold text-sm shadow-sm border border-gray-100"
                        >
                            Withdraw
                        </Button>
                    </div>

                    {/* History Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-[#1E293B]">History</h3>
                            <button className="text-[10px] font-bold text-[#2563EB]">See all</button>
                        </div>

                        <div className="space-y-3">
                            {/* Transaction Items */}
                            <div className="bg-white rounded-[20px] p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-0.5">Receive</p>
                                    <p className="text-sm font-bold text-[#1E1B4B]">Charles Boss</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#16A34A]">N10,000.00</p>
                                    <p className="text-[10px] text-gray-400">12.00 pm</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-0.5">Transfer</p>
                                    <p className="text-sm font-bold text-[#1E1B4B]">Chidi David</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#DC2626]">N3000.00</p>
                                    <p className="text-[10px] text-gray-400">12.00 pm</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-0.5">Receive</p>
                                    <p className="text-sm font-bold text-[#1E1B4B]">Charles Boss</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#16A34A]">N10,000.00</p>
                                    <p className="text-[10px] text-gray-400">12.00 pm</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 mb-0.5">Receive</p>
                                    <p className="text-sm font-bold text-[#1E1B4B]">Charles Boss</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-[#16A34A]">N10,000.00</p>
                                    <p className="text-[10px] text-gray-400">12.00 pm</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Money Modal (Bottom Sheet) */}
            {showAddMoneyModal && (
                <div className="absolute inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowAddMoneyModal(false)}
                    />

                    {/* Bottom Sheet - Create Account View (Mocking the flow) */}
                    <div className="relative bg-white w-full rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 z-10 flex flex-col items-center text-center">
                        {/* Handle Bar */}
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-10" />

                        {/* Icon */}
                        <div className="w-20 h-20 mb-6 relative">
                            {/* Placeholder for 3D Chess Piece */}
                            <div className="absolute inset-0 bg-blue-100 rounded-full flex items-center justify-center">
                                <div className="text-4xl">♟️</div>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-[#1E293B] mb-2 px-8 leading-tight">
                            Create an Account Number <br />
                            To receive cash into your Flex <br />
                            Naira Account
                        </h2>

                        <div className="w-full mt-8 mb-8 text-left">
                            <label className="text-xs text-gray-400 mb-2 block pl-1">Select Your Preferred Bank</label>
                            <div className="h-14 bg-[#FAFAFA] rounded-xl flex items-center px-4 border border-gray-100 text-gray-400 text-sm">
                                Preferred Bank
                            </div>
                        </div>

                        <Button className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-xl shadow-blue-900/10">
                            Create Account
                        </Button>
                    </div>
                </div>
            )}

            {/* Bottom Nav */}
            <div className="absolute bottom-6 left-6 right-6 h-[72px] bg-white rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-2 z-40">
                <Link href="/mobile-v2/home" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>
                <Link href="/mobile-v2/accounts" className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Account</span>
                </Link>
                <button className="flex flex-col items-center gap-1 text-[#1E40AF]">
                    <Briefcase className="w-6 h-6 fill-current" />
                    <span className="text-[10px] font-bold">Product</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Profile</span>
                </button>
            </div>

        </div>
    );
}
