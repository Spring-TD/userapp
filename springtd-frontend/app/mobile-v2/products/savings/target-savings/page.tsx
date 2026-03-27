'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    ChevronLeft,
    X,
    Home,
    User,
    Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TargetSavingsPage() {
    const [showInfoBanner, setShowInfoBanner] = useState(true);

    // Mock data for target savings
    const targets = [
        { id: 1, title: 'Save to a buy Building', amount: 'N30M', image: '/target-building.jpg' },
        { id: 2, title: 'Save to buy a Car', amount: 'N30M', image: '/target-car.jpg' },
        { id: 3, title: 'Save To a Buy Building', amount: 'N30M', image: '/target-building.jpg' },
        { id: 4, title: 'Save To buy a Car', amount: 'N30M', image: '/target-car.jpg' },
    ];

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
                    <div className="bg-[#1E40AF] rounded-[24px] p-6 text-center text-white relative overflow-hidden">
                        <p className="text-sm font-medium mb-1 text-blue-100">Target Saving Balance</p>
                        <h2 className="text-3xl font-bold mb-6">₦500,039.12</h2>

                        <div className="flex justify-center items-center gap-4">
                            <div className="bg-white text-[#1E3A8A] text-[10px] font-bold px-3 py-1.5 rounded-lg">
                                12% per annum
                            </div>
                            <div className="bg-white text-[#1E3A8A] text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                AG BANK: 1234567890
                            </div>
                        </div>
                    </div>

                    {/* Info Banner */}
                    {showInfoBanner && (
                        <div className="bg-[#E0E7FF] rounded-[20px] p-5 relative">
                            <button
                                onClick={() => setShowInfoBanner(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-xs font-bold text-[#1E1B4B] mb-3">What is new on Target Savings?</h3>
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
                                    <h3 className="text-sm font-semibold text-[#1E1B4B]">{target.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

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
