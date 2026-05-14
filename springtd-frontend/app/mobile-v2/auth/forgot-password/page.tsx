'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] relative p-6 pt-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/mobile-v2/auth/login" className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2">Forgot Password</h1>
                <div className="w-8" />
            </div>

            {/* Description Section */}
            <div className="mb-10 text-left">
                <p className="text-[20px] font-bold text-[#1E1B4B] leading-tight max-w-[90%]">
                    Enter your email and we’ll send you a link to reset your password.
                </p>
            </div>

            {/* Form */}
            <div className="space-y-6 flex-1">
                <div className="space-y-2">
                    <div className="relative group">
                        <input
                            type="email"
                            id="email"
                            placeholder=" "
                            className="peer w-full h-14 px-4 pt-4 pb-1 rounded-2xl bg-white border-0 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none text-base placeholder-transparent transition-all"
                            defaultValue="Louis04real@gmail.com"
                        />
                        <label
                            htmlFor="email"
                            className="absolute left-4 top-1.5 text-[11px] text-gray-400 font-medium transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400 pointer-events-none"
                        >
                            Email
                        </label>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto mb-4">
                <Link href="/mobile-v2/auth/forgot-password/sent">
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
