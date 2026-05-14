'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                {/* Header */}
                <div className="pt-12 px-6 flex items-center mb-6 bg-white sticky top-0 z-10 border-b border-gray-50 pb-4">
                    <Link href="/mobile-v2/profile" className="w-10 h-10 flex items-center justify-center -ml-2 text-gray-700">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="flex-1 text-center text-lg font-bold text-[#1E293B] mr-8">Privacy Policy</h1>
                </div>

                <div className="px-6 space-y-6 text-[#1E293B]">

                    <section>
                        <h2 className="font-bold text-base mb-2">Effective Date: January 1, 2025</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            This policy outlines how we handle your personal data starting from the date shown above.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">1. Overview</h2>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Your privacy is important to us. This Privacy Policy explains how [YourApp Name] collects, uses, and protects your personal information.
                        </p>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">2. Information We Collect</h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-2">
                            We may collect the following data:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-500 space-y-1 pl-1">
                            <li>Full name, email address, and phone number</li>
                            <li>Payment card information</li>
                            <li>Transaction history</li>
                            <li>Location data (with permission)</li>
                            <li>Device information</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">3. How We Use Your Data</h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-2">
                            We use your data to:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-500 space-y-1 pl-1">
                            <li>Provide and improve our services</li>
                            <li>Process transactions</li>
                            <li>Prevent fraud and ensure security</li>
                            <li>Send account-related notifications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="font-bold text-base mb-2">4. Data Sharing</h2>
                        <p className="text-sm text-gray-500 leading-relaxed mb-2">
                            We do not sell your data. We only share it with:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-500 space-y-1 pl-1">
                            <li>Regulatory authorities (when required by law)</li>
                        </ul>
                    </section>

                </div>
            </div>
        </div>
    );
}
