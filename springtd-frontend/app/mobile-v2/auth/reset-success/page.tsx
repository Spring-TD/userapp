'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function PasswordResetSuccessPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative items-center justify-center p-8 text-center">

            <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-[120px] h-[120px] relative mb-12"
            >
                {/* Using the Password Reset Success Icon uploaded by user */}
                <Image
                    src="/password-reset-success-icon.png"
                    alt="Success"
                    fill
                    className="object-contain"
                />
            </motion.div>

            <h1 className="text-2xl font-bold text-[#1E1B4B] mb-4">
                Hi! <span className="text-[#1E1B4B]">John</span>
            </h1>

            <p className="text-[#1E1B4B] text-[15px] leading-relaxed max-w-xs mb-12">
                Your password has been reset, you can now log back into your Airpay account
            </p>

            <Link href="/mobile-v2/auth/login" className="w-full">
                <Button
                    className="w-full h-14 rounded-[20px] bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-medium text-base shadow-lg shadow-blue-900/20"
                >
                    Go to Airpay app
                </Button>
            </Link>
        </div>
    );
}
