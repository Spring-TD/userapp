'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useToast } from "@/components/ui/use-toast";

export default function ConfirmPinPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [pin, setPin] = useState<string[]>([]);

    const handlePress = (key: string | number) => {
        if (typeof key === 'number') {
            if (pin.length < 4) {
                const newPin = [...pin, key.toString()];
                setPin(newPin);
                if (newPin.length === 4) {
                    // Simulate API call and success
                    setTimeout(() => {
                        // toast({
                        //    title: "Success",
                        //    description: "PIN updated successfully",
                        // });
                        router.push('/mobile-v2/profile');  // Go back to profile
                    }, 500);
                }
            }
        } else if (key === 'del') {
            setPin(pin.slice(0, -1));
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Header */}
            <div className="pt-12 px-6 flex items-center mb-12">
                <Link href="/mobile-v2/profile/reset-password/new-pin" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
            </div>

            <div className="flex-1 flex flex-col items-center px-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#2563EB] mb-6">
                    <Lock className="w-6 h-6" />
                </div>

                <h1 className="text-xl font-bold text-[#1E293B] mb-12">Re-enter New PIN</h1>

                {/* Dots */}
                <div className="flex gap-4 mb-auto">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-4 h-4 rounded-full transition-colors",
                                i < pin.length ? "bg-[#2563EB]" : "bg-gray-200"
                            )}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="w-full max-w-[320px] grid grid-cols-3 gap-y-6 gap-x-12 pb-12">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handlePress(num)}
                            className="h-16 flex items-center justify-center text-3xl font-medium text-[#1E293B] active:opacity-50 transition-opacity"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="h-16 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#2563EB] cursor-pointer" onClick={() => {/* Handle Forgot PIN logic */ }}>
                            Forgot PIN?
                        </span>
                    </div>
                    <button
                        onClick={() => handlePress(0)}
                        className="h-16 flex items-center justify-center text-3xl font-medium text-[#1E293B] active:opacity-50 transition-opacity"
                    >
                        0
                    </button>
                    <button
                        onClick={() => handlePress('del')}
                        className="h-16 flex items-center justify-center text-[#1E293B] active:opacity-50 transition-opacity"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
