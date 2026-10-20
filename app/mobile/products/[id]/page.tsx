'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProductDetailPage() {
    const router = useRouter();
    const [qty, setQty] = useState(1);
    const [size, setSize] = useState(42);

    return (
        <div className="min-h-screen bg-white pb-24 flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            {/* Product Image */}
            <div className="px-6 mb-6">
                <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100">
                    <img
                        src="https://images.unsplash.com/photo-1551754655-cd27e38d2076?q=80&w=2070&auto=format&fit=crop"
                        alt="Product"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Product Details */}
            <div className="px-6 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">A plot of Corn</h1>
                    <div className="flex gap-2">
                        <div className="bg-gray-100 rounded-lg px-3 py-1 flex items-center gap-2 text-sm font-medium">
                            <span className="text-gray-500">Qty</span>
                            <span>{qty}</span>
                            <ChevronDown size={14} className="text-gray-400" />
                        </div>
                        <div className="bg-gray-100 rounded-lg px-3 py-1 flex items-center gap-2 text-sm font-medium">
                            <span className="text-gray-500">Size</span>
                            <span>{size}</span>
                            <ChevronDown size={14} className="text-gray-400" />
                        </div>
                    </div>
                </div>

                <p className="text-gray-500 text-sm mb-8">
                    Delivery by <span className="font-bold text-gray-900">10 May 2XXX</span>
                </p>

                <div className="border-t border-gray-100 pt-8">
                    <h3 className="font-bold text-lg text-gray-900 mb-6">Order Payment Details</h3>

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Order Amounts</span>
                            <span className="font-bold text-gray-900">N16M</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Convenience</span>
                            <button className="text-blue-600 text-sm font-medium">Know More</button>
                            <button className="text-blue-600 text-sm font-medium">Apply Coupon</button>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Delivery Fee</span>
                            <span className="text-blue-600 font-medium">Free</span>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6 flex justify-between items-center mb-8">
                        <span className="font-bold text-lg text-gray-900">Order Total</span>
                        <span className="font-bold text-lg text-gray-900">N16M</span>
                    </div>

                    <Button
                        className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg"
                        onClick={() => router.push('/mobile/checkout')}
                    >
                        Proceed to Payment
                    </Button>
                </div>
            </div>
        </div>
    );
}
