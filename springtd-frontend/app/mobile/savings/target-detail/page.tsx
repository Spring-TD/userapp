'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContentMobile } from '@/components/ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import MobileBottomNav from '../../components/MobileBottomNav';

export default function TargetDetailPage() {
    const router = useRouter();
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState('wallet');

    const handleJoin = () => {
        setShowJoinModal(false);
        // Handle join logic
    };

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="p-6 pt-8">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            <div className="px-6 space-y-6">
                {/* Goal Card */}
                <div className="bg-[#2d5f36] rounded-2xl p-6 text-white">
                    <h2 className="text-base font-medium mb-2">Save to Buy a Building</h2>
                    <h1 className="text-4xl font-bold mb-2">₦30,000,000.00</h1>
                    <p className="text-white/80 text-sm">Saving plan towards a 2 bedroom duplex</p>
                </div>

                {/* Join Now Button */}
                <Button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full h-14 bg-[#4ade80] hover:bg-[#22c55e] text-gray-900 rounded-xl font-bold text-base"
                >
                    Join Now
                </Button>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-xl p-4 text-white">
                        <p className="text-xs text-gray-400 mb-1">Select Start date</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 text-white">
                        <p className="text-xs text-gray-400 mb-1">Select Buying Date</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 text-white">
                        <p className="text-xs text-gray-400 mb-2">Frequency</p>
                        <p className="font-bold text-sm">N500,000 Weekly</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 text-white">
                        <p className="text-xs text-gray-400 mb-2">Target</p>
                        <p className="font-bold text-sm">N30,000,000</p>
                    </div>
                </div>

                {/* Latest Activities */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 text-lg">Latest Activities</h3>
                        <button className="text-gray-600 text-sm font-medium">See all</button>
                    </div>

                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white p-4 rounded-xl flex justify-between items-center border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Receive</p>
                                    <h4 className="font-bold text-gray-900">Charles Boss</h4>
                                </div>
                                <p className="font-bold text-green-600">N500,000.00</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Join Target Modal */}
            <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
                <DialogContentMobile className="w-[90%] max-w-[360px] mx-auto rounded-3xl p-6">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Join Target</h2>
                        <p className="text-sm text-gray-600">
                            This is a savings challenge to save N30,000,000. You earn interests, paid daily.
                        </p>
                    </div>

                    <div className="space-y-3 mb-6">
                        <button
                            onClick={() => setSelectedMethod('wallet')}
                            className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedMethod === 'wallet'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'wallet' ? 'border-green-500' : 'border-gray-300'
                                }`}>
                                {selectedMethod === 'wallet' && (
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                )}
                            </div>
                            <span className="font-medium text-gray-700">Debit Wallet</span>
                        </button>

                        <button
                            onClick={() => setSelectedMethod('card')}
                            className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedMethod === 'card'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'card' ? 'border-green-500' : 'border-gray-300'
                                }`}>
                                {selectedMethod === 'card' && (
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                )}
                            </div>
                            <span className="font-medium text-gray-700">Debit Card</span>
                        </button>

                        <button
                            onClick={() => setSelectedMethod('both')}
                            className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${selectedMethod === 'both'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === 'both' ? 'border-green-500' : 'border-gray-300'
                                }`}>
                                {selectedMethod === 'both' && (
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                )}
                            </div>
                            <span className="font-medium text-gray-700">Debit Both</span>
                        </button>
                    </div>

                    <Button
                        onClick={handleJoin}
                        className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-900 rounded-full font-semibold"
                    >
                        Join Target
                    </Button>
                </DialogContentMobile>
            </Dialog>

            <MobileBottomNav />
        </div>
    );
}
