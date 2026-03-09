'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SuccessPage() {
    const router = useRouter();

    // Auto-redirect after show
    useEffect(() => {
        const timer = setTimeout(() => {
            //   router.push('/mobile-v2/home'); // TODO: Redirect to home after specific time or keep it manual? 
            // Design has "Let's get started" button, so probably manual.
        }, 3000);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] items-center justify-center p-8 text-center relative">

            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-[140px] h-[140px] relative mb-12"
                >
                    {/* Using the uploaded checkmark asset */}
                    <Image
                        src="/success-checkmark.png"
                        alt="Success"
                        fill
                        className="object-contain"
                    />
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold text-[#1E1B4B] mb-2">
                        Hi! <span className="text-[#1E1B4B]">John</span>
                    </h1>
                    <h2 className="text-xl text-[#1E1B4B] font-medium">
                        Welcome to Airpay
                    </h2>
                </motion.div>
            </div>

            <div className="w-full mt-auto mb-4">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/mobile-v2/home')}
                    className="w-full h-14 rounded-[20px] bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-medium text-base shadow-lg shadow-blue-900/20"
                >
                    Let's get started
                </motion.button>
            </div>

        </div>
    );
}
