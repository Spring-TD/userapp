'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsConditionsPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-6 bg-white sticky top-0 z-10 border-b border-gray-50 pb-4">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Terms & Conditions</h1>
                </div>

                <div className="px-6 space-y-6 text-[#1E293B]">

                    <section>
                        <h2 className="font-bold text-base mb-2">Effective Date: January 1, 2025</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            This document governs your rights and obligations when using our services, effective from the date above.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">1. Introduction</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Welcome to [YourApp Name]. By using our mobile application or website, you agree to these Terms and Conditions. Please read them carefully.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">2. Eligibility</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            You must be at least 18 years old to use our services. By registering, you confirm that the information you provide is accurate and complete.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">3. Services</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Our platform offers digital wallet services, peer-to-peer transfers, card management, and international transactions. We reserve the right to modify or terminate any part of the service at any time.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">4. Fees and Charges</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            We aim to keep fees transparent. You will be notified of any charges before confirming a transaction. Please refer to our Pricing Page for up-to-date details.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">5. User Responsibilities</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account credentials.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
}
