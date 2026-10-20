'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsConditionsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 pt-8 flex items-center gap-4 z-10">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Terms & Conditions</h1>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Effective Date: January 1, 2025</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        This document governs your rights and obligations when using our services, effective from the date above.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">1. Introduction</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Welcome to [YourApp Name]. By using our mobile application or website, you agree to these Terms and Conditions. Please read them carefully.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">2. Eligibility</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        You must be at least 18 years old to use our services. By registering, you confirm that the information you provide is accurate and complete.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">3. Services</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Our platform offers digital wallet services, peer-to-peer transfers, card management, and international transactions. We reserve the right to modify or terminate any part of the service at any time.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">4. Fees and Charges</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We aim to keep fees transparent. You will be notified of any charges before confirming a transaction. Please refer to our Pricing Page for up-to-date details.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">5. User Responsibilities</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        You are responsible for maintaining the security of your account credentials. You agree to:
                    </p>
                    <ul className="space-y-2 ml-4">
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Keep your password confidential</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Notify us immediately of any unauthorized access</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Use the service only for lawful purposes</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">6. Prohibited Activities</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">
                        You may not use our services to:
                    </p>
                    <ul className="space-y-2 ml-4">
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Engage in fraudulent or illegal activities</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Violate any applicable laws or regulations</span>
                        </li>
                        <li className="text-gray-600 text-sm leading-relaxed flex gap-2">
                            <span className="text-gray-900">•</span>
                            <span>Interfere with the operation of our platform</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">7. Limitation of Liability</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We are not liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability is limited to the amount of fees you paid in the past 12 months.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">8. Termination</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We reserve the right to suspend or terminate your account if you violate these Terms and Conditions or engage in suspicious activity.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">9. Changes to Terms</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        We may update these Terms and Conditions from time to time. Continued use of our services after changes are posted constitutes acceptance of the new terms.
                    </p>
                </div>

                <div>
                    <h3 className="text-base font-bold text-gray-900 mb-3">10. Contact Us</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        If you have questions about these Terms and Conditions, please contact us at support@yourapp.com.
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
