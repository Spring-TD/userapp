'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContentMobile } from "@/components/ui/dialog";

export default function CheckoutPage() {
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<'visa' | 'mastercard'>('visa');
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePayment = () => {
        setShowSuccess(true);
        // Simulate redirect after success
        setTimeout(() => {
            router.push('/mobile/home');
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-white p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center mb-8 pt-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <div className="flex-1 text-center font-bold text-lg pr-8">
                    Checkout
                </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Order</span>
                    <span className="text-gray-400 font-medium">N16M</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Shipping</span>
                    <span className="text-gray-400 font-medium">30</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-gray-600 font-medium">N16M</span>
                </div>
            </div>

            <div className="h-px bg-gray-100 mb-8" />

            {/* Payment Methods */}
            <div className="space-y-4 mb-auto">
                <h3 className="font-bold text-gray-900 mb-4">Payment</h3>

                <button
                    onClick={() => setPaymentMethod('visa')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${paymentMethod === 'visa' ? 'border-blue-600 bg-blue-50/50' : 'border-transparent bg-gray-50'
                        }`}
                >
                    <span className="font-bold text-blue-900 text-xl italic">VISA</span>
                    <span className="text-gray-500">*********2109</span>
                </button>

                <button
                    onClick={() => setPaymentMethod('mastercard')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${paymentMethod === 'mastercard' ? 'border-blue-600 bg-blue-50/50' : 'border-transparent bg-gray-50'
                        }`}
                >
                    <div className="flex items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
                        <div className="w-6 h-6 rounded-full bg-yellow-500 opacity-80 -ml-3" />
                    </div>
                    <span className="text-gray-500">*********2109</span>
                </button>
            </div>

            <Button
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg mt-8"
                onClick={handlePayment}
            >
                Continue
            </Button>

            {/* Success Modal */}
            <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                <DialogContentMobile className="bg-white rounded-3xl border-none shadow-2xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                        {/* Confetti/Particles */}
                        <div className="absolute -top-4 -left-4 w-2 h-2 bg-green-200 rounded-full" />
                        <div className="absolute top-0 right-8 w-2 h-2 bg-green-200 rounded-full" />
                        <div className="absolute bottom-4 -right-2 w-2 h-2 bg-green-200 rounded-full" />

                        {/* Checkmark Circle */}
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                            <Check className="w-10 h-10 text-white stroke-[3]" />
                        </div>
                    </div>

                    <h2 className="font-bold text-gray-900 text-lg mb-6">Payment done successfully.</h2>

                    <Button
                        className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white rounded-full font-medium"
                        onClick={() => router.push('/mobile/home')}
                    >
                        Continue
                    </Button>
                </DialogContentMobile>
            </Dialog>
        </div>
    );
}
