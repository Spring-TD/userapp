'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewPasswordPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] relative p-6 pt-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/mobile-v2/auth/forgot-password/sent" className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2">New Password</h1>
                <div className="w-8" />
            </div>

            {/* Icon */}
            <div className="mb-6 relative w-16 h-16">
                <Image
                    src="/lock-icon-new.png"
                    alt="Secure Lock"
                    fill
                    className="object-contain"
                />
            </div>

            {/* Description Section */}
            <div className="mb-8 text-left">
                <h2 className="text-[24px] font-bold text-[#1E1B4B] mb-2">
                    Set your password
                </h2>
                <p className="text-[#1E1B4B] text-[15px] leading-relaxed max-w-[90%]">
                    Please create your new account password for Airpay
                </p>
            </div>

            {/* Form */}
            <div className="space-y-6 flex-1">
                <div className="space-y-4">
                    {/* Password Input */}
                    <div className="relative group">
                        <input
                            type="password"
                            id="password"
                            placeholder=" "
                            className="peer w-full h-14 px-4 pt-4 pb-1 rounded-2xl bg-white border-0 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none text-base placeholder-transparent transition-all font-bold tracking-widest"
                            defaultValue="Password123"
                        />
                        <label
                            htmlFor="password"
                            className="absolute left-4 top-1.5 text-[11px] text-gray-400 font-medium transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400 pointer-events-none tracking-normal font-normal"
                        >
                            Password
                        </label>
                    </div>

                    {/* Retype Password Input */}
                    <div className="relative group">
                        <input
                            type="password"
                            id="retype-password"
                            placeholder=" "
                            className="peer w-full h-14 px-4 pt-4 pb-1 rounded-2xl bg-white border-0 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none text-base placeholder-transparent transition-all font-bold tracking-widest"
                            defaultValue="Password123"
                        />
                        <label
                            htmlFor="retype-password"
                            className="absolute left-4 top-1.5 text-[11px] text-gray-400 font-medium transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400 pointer-events-none tracking-normal font-normal"
                        >
                            Retype Password
                        </label>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto mb-4">
                <Link href="/mobile-v2/auth/login">
                    <Button
                        className="w-full h-14 rounded-[20px] bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-medium text-base shadow-lg shadow-blue-900/20"
                    >
                        Continue
                    </Button>
                </Link>
            </div>
        </div>
    );
}
