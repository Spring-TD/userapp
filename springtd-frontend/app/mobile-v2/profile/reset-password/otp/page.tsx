'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"

export default function OTPPage() {
    const [seconds, setSeconds] = useState(56);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Header */}
            <div className="pt-12 px-6 flex items-center mb-8">
                <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
            </div>

            <div className="px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#2563EB] mb-6">
                    <MessageSquare className="w-7 h-7 fill-current" />
                </div>

                <h1 className="text-2xl font-bold text-[#1E293B] mb-3">Enter OTP</h1>
                <p className="text-sm text-gray-500 max-w-[280px] leading-relaxed mb-12">
                    We are sent to one time verification code to your example@gmail.com
                </p>

                <div className="mb-8">
                    <InputOTP maxLength={5}>
                        <InputOTPGroup className="gap-4">
                            {[0, 1, 2, 3, 4].map((idx) => (
                                <div key={idx} className="relative">
                                    <InputOTPSlot
                                        index={idx}
                                        className="w-3 h-3 rounded-full bg-gray-300 border-none ring-0 p-0 text-transparent data-[active=true]:bg-blue-500 data-[active=true]:scale-125 transition-all"
                                    />
                                    {/* This is a visual hack to simulate the 'dots' look. 
                                        The actual InputOTP usually renders boxes. 
                                        The shadcn component might lock styling.
                                        I'll use proper scaling or just default boxes if dots are hard.
                                        Let's try standard slots first but styled minimal.
                                    */}
                                </div>
                            ))}
                        </InputOTPGroup>
                    </InputOTP>

                    {/* 
                        Alternative: If InputOTP is strictly boxes, I'll just use a custom dot visualization manually 
                        and a hidden input, but since I have the component, I'll try to use it naturally 
                        or just stick to the text input for now as I can't see the component implementation details fully.
                        
                        Actually, looking at the image, it's dots.
                        I'll try to just render the component standard way but maybe with `className` to round them.
                     */}
                </div>

                {/* Re-implementing a simpler dot display for visual accuracy to mockup if InputOTP fails visually */}
                <div className="flex gap-6 mb-12">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                    ))}
                </div>

                <p className="text-sm text-gray-500">
                    You can get code again in <span className="text-blue-600 font-semibold">{seconds} seconds</span>
                </p>

                <div className="flex-1" />

                <Link href="/mobile-v2/profile/reset-password/new-pin" className="w-full mb-8">
                    <Button className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-lg shadow-blue-900/20">
                        Confirm
                    </Button>
                </Link>
            </div>
        </div>
    );
}
