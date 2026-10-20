'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MobileBottomNav from '../../components/MobileBottomNav';

export default function FlexDollarPage() {
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
                {/* Balance Card - Orange Theme */}
                <div className="bg-orange-600 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">6% per annum</span>
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">AG BANK: 1234567890</span>
                    </div>

                    <div className="text-center">
                        <p className="text-white/90 text-sm mb-1">Flex Dollar Balance</p>
                        <h1 className="text-3xl font-bold">$1,200.00</h1>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-orange-50 rounded-2xl p-4 relative">
                    <button className="absolute top-4 right-4 text-orange-500">
                        <X size={16} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">What is new on Flex Dollar?</h3>
                    <ul className="space-y-3 text-xs text-gray-800 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Fund your dollar wallet directly from your local bank card at the best rates.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Save in dollars to protect your money from devaluation.
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Withdraw directly to your domiciliary account or convert to Naira instantly.
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button className="flex-1 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium">
                        Buy Dollar
                    </Button>
                    <Button variant="outline" className="flex-1 h-12 rounded-full font-medium border-gray-300">
                        Sell Dollar
                    </Button>
                </div>

                {/* History */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">History</h3>
                        <button className="text-orange-600 text-sm font-medium">See all</button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Purchased</p>
                                <h4 className="font-bold text-gray-900">Wallet Funding</h4>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600">+$200.00</p>
                                <p className="text-xs text-gray-400">12.00 pm</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Sold</p>
                                <h4 className="font-bold text-gray-900">Conversion to Naira</h4>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-red-600">-$50.00</p>
                                <p className="text-xs text-gray-400">Yesterday</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <MobileBottomNav />
        </div>
    );
}
