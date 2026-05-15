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
            <div className="pt-12 px-6 flex items-center mb-8">
                <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
            </div>

            <div className="px-6 flex flex-col items-start text-left w-full">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[var(--sf-primary,#2563EB)] mb-6 self-start">
                    <MessageSquare className="w-7 h-7 fill-current" />
                </div>

                <h1 className="text-2xl font-bold text-[#1E293B] mb-3 w-full text-left">Enter OTP</h1>
                <p className="text-sm text-gray-500 w-full leading-relaxed mb-10 text-left">
                    We are sent to one time verification code to your example@gmail.com
                </p>

                <div className="mb-10 w-full">
                    <InputOTP maxLength={6} containerClassName="gap-3 sm:gap-4 justify-start w-full flex-nowrap">
                        <InputOTPGroup className="gap-3 sm:gap-4 flex-nowrap">
                            {[0, 1, 2, 3, 4, 5].map((idx) => (
                                <div key={idx} className="relative">
                                    <InputOTPSlot
                                        index={idx}
                                        className="h-9 w-9 rounded-full border-none bg-gray-300 p-0 text-transparent shadow-none ring-0 data-[active=true]:bg-[var(--sf-primary,#2563EB)] data-[active=true]:scale-110 data-[active=true]:ring-0 transition-all"
                                    />
                                </div>
                            ))}
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                <p className="text-sm text-gray-500 w-full text-left mb-8">
                    You can get code again in <span className="text-[var(--sf-primary,#2563EB)] font-semibold">{seconds} seconds</span>
                </p>

                <div className="flex-1 min-h-4" />

                <Link href="/mobile-v2/profile/reset-password/new-pin" className="w-full mb-8">
                    <Button className="w-full h-14 rounded-full bg-[var(--sf-button,#1E40AF)] hover:bg-[var(--sf-button-hover,#1e3a8a)] text-white font-semibold text-base shadow-lg shadow-blue-900/20">
                        Confirm
                    </Button>
                </Link>
            </div>
        </div>
    );
}
