'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, X, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MobileBottomNav from '../../components/MobileBottomNav';

export default function SafeLockPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Savings</h1>
            </div>

            <div className="px-6 space-y-6">
                {/* Balance Card - Yellow Theme */}
                <div className="bg-yellow-500 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">15% per annum</span>
                        <Lock className="text-white/80" />
                    </div>

                    <div className="text-center">
                        <p className="text-white/90 text-sm mb-1">Safe Lock Balance</p>
                        <h1 className="text-3xl font-bold">₦250,000.00</h1>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 rounded-2xl p-4 relative">
                    <button className="absolute top-4 right-4 text-yellow-600">
                        <X size={16} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">What is new on Safe Lock?</h3>
                    <ul className="space-y-3 text-xs text-gray-800 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Lock funds for a fixed period to earn higher interest rates up to 15% per annum.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Interest is paid upfront instantly into your Flex Naira wallet.
                        </li>
                    </ul>
                </div>

                {/* Create Lock Button */}
                <Button className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-bold text-lg">
                    Create New Safe Lock
                </Button>

                {/* Active Locks */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">Active Locks</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Lock size={18} className="text-yellow-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Rent Savings</h4>
                                    <p className="text-xs text-gray-500">Matures: Dec 20, 2024</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">N150,000</p>
                                <p className="text-xs text-green-600">+15%</p>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Lock size={18} className="text-yellow-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">School Fees</h4>
                                    <p className="text-xs text-gray-500">Matures: Jan 10, 2025</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-900">N100,000</p>
                                <p className="text-xs text-green-600">+12%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}
