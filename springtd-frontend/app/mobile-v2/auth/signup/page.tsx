'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function SignupPage() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] relative p-6 pt-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link href="/mobile-v2" className="p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-semibold absolute left-1/2 -translate-x-1/2">Sign Up</h1>
                <div className="w-8" />
            </div>

            {/* Welcome Section */}
            <div className="mb-10 text-center">
                <h2 className="text-[28px] font-bold text-[#1E1B4B] mb-2 tracking-tight">Welcome to Airpay</h2>
                <p className="text-gray-500 text-[15px] leading-normal px-4">
                    Complete the sign up to get started
                </p>
            </div>

            {/* Form */}
            <div className="space-y-6 flex-1">
                <div className="space-y-2">
                    <div className="relative group">
                        <input
                            type="text"
                            id="name"
                            placeholder=" "
                            className="peer w-full h-14 px-4 pt-4 pb-1 rounded-2xl bg-white border-0 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#2563EB]/20 focus:outline-none text-base placeholder-transparent transition-all"
                            defaultValue="Louis Real"
                        />
                        <label
                            htmlFor="name"
                            className="absolute left-4 top-1.5 text-[11px] text-gray-400 font-medium transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:text-gray-400 pointer-events-none"
                        >
                            Name
                        </label>
                    </div>
                </div>

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

                <div className="space-y-2">
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
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
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-start gap-3 mt-8 px-1">
                    <Checkbox id="terms" className="mt-1 border-gray-400 data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]" />
                    <label htmlFor="terms" className="text-sm text-[#1E293B] leading-relaxed">
                        By signing up, you agree to the <Link href="#" className="text-[#2563EB]">Terms of Service and Privacy Policy</Link>
                    </label>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 mb-4 flex items-center gap-4">
                {/* Secondary Action: Login */}
                <Link href="/mobile-v2/auth/login" className="flex-1">
                    <Button
                        variant="secondary"
                        className="w-full h-14 rounded-[20px] bg-[#E0E7FF] text-[#4338CA] hover:bg-[#C7D2FE] font-medium text-base shadow-none border-0"
                    >
                        Login
                    </Button>
                </Link>

                {/* Primary Action: Register */}
                <Link href="/mobile-v2/auth/success" className="flex-[2]">
                    <Button
                        className="w-full h-14 rounded-[20px] bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-medium text-base shadow-lg shadow-blue-900/20"
                    >
                        Register
                    </Button>
                </Link>
            </div>
        </div>
    );
}
