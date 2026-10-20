'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 pt-8 flex items-center gap-4 z-10">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Effective Date: January 1, 2025</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        This policy outlines how we handle your personal data starting from the date shown above.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">1. Overview</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Your privacy is important to us. This Privacy Policy explains how [YourApp Name] collects, uses, and protects your personal information.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">2. Information We Collect</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        We may collect the following data:
                    </p>
                    <ul className="space-y-2 ml-4">
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Full name, email address, and phone number</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Payment card information</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Transaction history</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Location data (with permission)</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Device information</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">3. How We Use Your Data</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        We use your data to:
                    </p>
                    <ul className="space-y-2 ml-4">
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Provide and improve our services</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Process transactions</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Prevent fraud and ensure security</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Send account-related notifications</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">4. Data Sharing</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        We do not sell your data. We only share it with:
                    </p>
                    <ul className="space-y-2 ml-4">
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Regulatory authorities (when required by law)</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Service providers who help us operate our platform</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">5. Your Rights</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        You have the right to access, update, or delete your personal information. Contact us at support@yourapp.com for assistance.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">6. Data Security</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We implement industry-standard security measures to protect your data from unauthorized access, alteration, or disclosure.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">7. Changes to This Policy</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We may update this Privacy Policy from time to time. We will notify you of any significant changes via email or app notification.
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <p className="text-gray-500 text-xs">
                        Last updated: January 1, 2025
                    </p>
                </div>
            </div>
        </div>
    );
}
