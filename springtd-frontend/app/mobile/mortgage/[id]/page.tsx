'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContentMobile } from "@/components/ui/dialog";

export default function MortgageDetailPage() {
    const router = useRouter();
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div className="min-h-screen bg-white pb-24 flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Hot Mortgage</h1>
            </div>

            {/* Images Row */}
            <div className="px-6 mb-6">
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    <div className="w-64 h-64 flex-shrink-0 rounded-2xl overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="House 1" />
                    </div>
                    <div className="w-64 h-64 flex-shrink-0 rounded-2xl overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="House 2" />
                    </div>
                    <div className="w-64 h-64 flex-shrink-0 rounded-2xl overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="House 3" />
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="px-6 flex-1">
                <p className="text-gray-600 leading-relaxed mb-4">
                    Lorem ipsum dolor sit amet consectetur. Malesuada volutpat risus adipiscing nunc amet dolor eu fermentum. Sollicitudin magna massa purus elit a eu. Lorem ipsum dolor sit amet consectetur.
                </p>

                <div className="flex flex-wrap gap-y-2 gap-x-6 mb-8 text-sm font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-yellow-600 rounded-full" />
                        </div>
                        <span>Sellers details</span>
                    </div>
                    <div>Price: 18M</div>
                    <div>Interest: 18M</div>
                    <div>Repayment Circle: 1 year</div>
                </div>

                <Button
                    className="w-32 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
                    onClick={() => setShowConfirm(true)}
                >
                    Buy Mortgage
                </Button>

                {/* More Hot Mortgage Section */}
                <div className="mt-12">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">Hot Mortgage</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
                                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="Related 1" />
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">Lorem ipsum dolor sit amet consectetur.</p>
                            <p className="font-bold text-xs">Price 18M</p>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                                </div>
                                <span className="text-xs text-gray-900 font-medium">Sellers details</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100">
                                <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover" alt="Related 2" />
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-1">Lorem ipsum dolor sit amet consectetur.</p>
                            <p className="font-bold text-xs">Price 18M</p>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-yellow-600 rounded-full" />
                                </div>
                                <span className="text-xs text-gray-900 font-medium">Sellers details</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContentMobile className="bg-white rounded-3xl border-none shadow-2xl p-6 flex flex-col items-center justify-center text-center">
                    <button onClick={() => setShowConfirm(false)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>

                    <h2 className="font-bold text-blue-600 text-xl mb-4">Buy Mortgage</h2>

                    <p className="text-gray-600 text-sm mb-8 max-w-xs">
                        Transfer to any of your account below, and your flex saving will be credited instantly.
                    </p>

                    <Button
                        className="w-full h-12 bg-white hover:bg-gray-50 text-blue-600 border border-blue-600 rounded-full font-medium"
                        onClick={() => setShowConfirm(false)}
                    >
                        Confirm
                    </Button>
                </DialogContentMobile>
            </Dialog>
        </div>
    );
}
