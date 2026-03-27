'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FlexNairaPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white pb-24 flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Savings</h1>
            </div>

            <div className="px-6 space-y-6">
                {/* Balance Card */}
                <div className="bg-[#C026D3] rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-8">
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">12% per annum</span>
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">AG BANK: 1234567890</span>
                    </div>

                    <div className="text-center">
                        <p className="text-white/90 text-sm mb-1">Flex Naira Balance</p>
                        <h1 className="text-3xl font-bold">₦500,039.12</h1>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-pink-100 rounded-2xl p-4 relative">
                    <button className="absolute top-4 right-4 text-pink-500">
                        <X size={16} />
                    </button>
                    <h3 className="font-bold text-gray-900 text-sm mb-3">What is new on Flex Naira?</h3>
                    <ul className="space-y-3 text-xs text-gray-800 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Click Add Money to generate a PocketApp account number. It is the fastest and most reliable way to fund your Flex Naira wallet
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Search for PocketApp on your bank app and enter your new PocketApp account number
                        </li>
                        <li className="flex gap-2">
                            <span className="block w-1 h-1 bg-gray-800 rounded-full mt-1.5 flex-shrink-0" />
                            Send funds and it'll be credited to your Flex Naira wallet in seconds
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <Link href="/mobile/savings/flex-naira/create-account" className="flex-1">
                        <Button className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full font-medium">
                            Add Money
                        </Button>
                    </Link>
                    <Button variant="outline" className="flex-1 h-12 rounded-full font-medium border-gray-300">
                        Withdraw
                    </Button>
                </div>

                {/* History */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">History</h3>
                        <button className="text-pink-600 text-sm font-medium">See all</button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Receive</p>
                                <h4 className="font-bold text-gray-900">Charles Boss</h4>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600">N10,000.00</p>
                                <p className="text-xs text-gray-400">12.00 pm</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Transfer</p>
                                <h4 className="font-bold text-gray-900">Chidi David</h4>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-red-600">N3000.00</p>
                                <p className="text-xs text-gray-400">12.00 pm</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Receive</p>
                                <h4 className="font-bold text-gray-900">Charles Boss</h4>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-green-600">N10,000.00</p>
                                <p className="text-xs text-gray-400">12.00 pm</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
