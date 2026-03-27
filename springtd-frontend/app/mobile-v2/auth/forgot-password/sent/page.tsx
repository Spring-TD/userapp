'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function EmailSentPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] relative p-6 pt-12 items-center justify-center">

            {/* Icon */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="w-[280px] h-[280px] relative mb-8 flex items-center justify-center"
            >
                <Image
                    src="/email-icon-3d.png"
                    alt="Email Sent"
                    fill
                    className="object-contain drop-shadow-xl"
                />
            </motion.div>

            {/* Text Content */}
            <div className="text-center mb-12 max-w-xs">
                <h2 className="text-[24px] font-bold text-[#1E1B4B] mb-4">
                    Your email is on the way
                </h2>
                <p className="text-gray-500 text-[15px] leading-relaxed">
                    Check your email test@test.com and follow the instructions to reset your password
                </p>
            </div>

            {/* Bottom Actions */}
            <div className="w-full mt-auto mb-4 space-y-4">
                <Link href="/mobile-v2/auth/new-password">
                    <Button
                        className="w-full h-14 rounded-[20px] bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-medium text-base shadow-lg shadow-blue-900/20"
                    >
                        Continue
                    </Button>
                </Link>

                <Link href="/mobile-v2/auth/login" className="block text-center">
                    <button className="text-gray-400 font-medium text-sm hover:text-gray-600 transition-colors">
                        Skip
                    </button>
                </Link>
            </div>
        </div>
    );
}
