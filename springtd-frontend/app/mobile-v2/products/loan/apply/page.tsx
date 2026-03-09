'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronDown, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoanApplyPage() {
    const [agreed, setAgreed] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = () => {
        setShowSuccess(true);
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                {/* Header */}
                <div className="pt-12 px-6 mb-6">
                    <Link href="/mobile-v2/products/loan" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                </div>

                <div className="px-6 space-y-4">
                    {/* Repayment Circle */}
                    <div className="bg-white rounded-[20px] px-5 h-[60px] flex items-center justify-between cursor-pointer">
                        <span className="text-gray-400 text-sm">Repayment Circle</span>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Collateral Type */}
                    <div className="bg-white rounded-[20px] px-5 h-[60px] flex items-center justify-between cursor-pointer">
                        <span className="text-gray-400 text-sm">Collateral Type</span>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Credit History */}
                    <div className="bg-white rounded-[20px] px-5 h-[60px] flex items-center justify-between cursor-pointer">
                        <span className="text-gray-400 text-sm">Credit history</span>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Outstanding Loan */}
                    <div className="bg-white rounded-[20px] px-5 py-3 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-500 font-medium mb-1">Current Outstanding Loan</label>
                        <input
                            type="text"
                            placeholder="Enter outstanding amount"
                            className="w-full text-sm text-[#1E1B4B] placeholder-gray-300 focus:outline-none"
                        />
                    </div>

                    {/* Bank Statement Upload */}
                    <div className="bg-white rounded-[20px] padding p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Bank Statement</p>
                                <p className="text-[10px] text-gray-400">PDF format • Max. 5MB</p>
                            </div>
                        </div>
                        <button className="bg-black text-white text-[10px] font-bold px-4 py-2 rounded-lg">
                            Upload
                        </button>
                    </div>

                    {/* Guarantor BVN 1 */}
                    <div className="bg-white rounded-[20px] px-5 py-3 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-500 font-medium mb-1">Guarantor BVN</label>
                        <input
                            type="text"
                            placeholder="Enter BVN"
                            className="w-full text-sm text-[#1E1B4B] placeholder-gray-300 focus:outline-none"
                        />
                    </div>

                    {/* Guarantor BVN 2 (Based on design repeated fields) */}
                    <div className="bg-white rounded-[20px] px-5 py-3 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-500 font-medium mb-1">Guarantor BVN</label>
                        <input
                            type="text"
                            placeholder="Enter BVN"
                            className="w-full text-sm text-[#1E1B4B] placeholder-gray-300 focus:outline-none"
                        />
                    </div>

                    {/* Guarantor BVN 3 */}
                    <div className="bg-white rounded-[20px] px-5 py-3 flex flex-col justify-center">
                        <label className="text-[10px] text-gray-500 font-medium mb-1">Guarantor BVN</label>
                        <input
                            type="text"
                            placeholder="Enter BVN"
                            className="w-full text-sm text-[#1E1B4B] placeholder-gray-300 focus:outline-none"
                        />
                    </div>

                    {/* Guarantor ID Upload */}
                    <div className="bg-white rounded-[20px] padding p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Upload className="w-5 h-5 text-gray-500" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Guarantor ID</p>
                                <p className="text-[10px] text-gray-400">PDF format • Max. 5MB</p>
                            </div>
                        </div>
                        <button className="bg-black text-white text-[10px] font-bold px-4 py-2 rounded-lg">
                            Upload
                        </button>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="flex items-center gap-3 justify-center pt-2">
                        <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${agreed ? 'bg-black border-black text-white' : 'border-gray-300 bg-white'}`}
                            onClick={() => setAgreed(!agreed)}
                        >
                            {agreed && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-xs text-gray-500">I agreed with the Terms and Condition</span>
                    </div>

                    {/* Submit Button */}
                    <Button
                        className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-xl shadow-blue-900/10 mt-4"
                        disabled={!agreed}
                        onClick={handleSubmit}
                    >
                        Submit
                    </Button>

                </div>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="absolute inset-0 z-50 flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowSuccess(false)}
                    />

                    {/* Bottom Sheet */}
                    <div className="relative bg-white w-full rounded-t-[30px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 z-10 flex flex-col items-center">
                        {/* Handle Bar */}
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8" />

                        {/* Success Icon */}
                        <div className="w-32 h-32 mb-6 relative">
                            {/* Background Circle */}
                            <div className="absolute inset-0 bg-[#2DD4BF] rounded-full opacity-20"></div>
                            <div className="absolute inset-4 bg-[#2DD4BF] rounded-full flex items-center justify-center shadow-lg transform rotate-3">
                                <Check className="w-16 h-16 text-white stroke-[4]" />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-[#1E293B] text-center mb-8">Loan Approved</h2>

                        <Link href="/mobile-v2/products/loan" className="w-full">
                            <Button className="w-full h-14 rounded-full bg-[#1E40AF] hover:bg-[#1e3a8a] text-white font-semibold text-base shadow-xl shadow-blue-900/10">
                                Continue
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
