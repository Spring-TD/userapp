'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContentMobile } from '@/components/ui/dialog';
import { ArrowLeft, Check, CloudUpload, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoanApplicationPage() {
    const router = useRouter();
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = () => {
        setShowSuccess(true);
    };

    return (
        <div className="min-h-screen bg-white pb-24 flex flex-col">
            {/* Header */}
            <div className="p-6 pt-8 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            <div className="px-6 space-y-4">
                {/* Repayment Circle */}
                <div className="border border-gray-200 rounded-xl px-4 h-14 flex items-center">
                    <select className="w-full bg-transparent outline-none text-gray-700 text-sm">
                        <option value="">Repayment Circle</option>
                        <option value="1">1 Month</option>
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                    </select>
                </div>

                {/* Collateral Type */}
                <div className="border border-gray-200 rounded-xl px-4 h-14 flex items-center">
                    <select className="w-full bg-transparent outline-none text-gray-700 text-sm">
                        <option value="">Collateral Type</option>
                        <option value="car">Car</option>
                        <option value="property">Property</option>
                        <option value="land">Land</option>
                    </select>
                </div>

                {/* Credit History */}
                <div className="border border-gray-200 rounded-xl px-4 h-14 flex items-center">
                    <select className="w-full bg-transparent outline-none text-gray-700 text-sm">
                        <option value="">Credit history</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                    </select>
                </div>

                {/* Outstanding Loan */}
                <div className="border border-gray-200 rounded-xl px-4 h-14 flex items-center">
                    <input
                        type="text"
                        placeholder="Current Outstanding Loan"
                        className="w-full bg-transparent outline-none text-gray-700 text-sm placeholder:text-gray-500"
                    />
                </div>

                {/* Bank Statement Upload */}
                <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <CloudUpload size={20} />
                        </div>
                        <div>
                            <p className="text-gray-900 text-sm font-medium">Bank Statement</p>
                            <p className="text-gray-400 text-xs">PDF format • Max. 5MB</p>
                        </div>
                    </div>
                    <button className="bg-black text-white text-xs px-4 py-2 rounded-lg font-medium">
                        Upload
                    </button>
                </div>

                {/* Guarantor Name */}
                <div className="border border-gray-200 rounded-xl px-4 py-2 h-16">
                    <label className="text-xs text-gray-500 block mb-1">Guarantor Name</label>
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none text-gray-900 font-medium"
                        defaultValue="|"
                    />
                </div>

                {/* Guarantor Address */}
                <div className="border border-gray-200 rounded-xl px-4 py-2 h-16">
                    <label className="text-xs text-gray-500 block mb-1">Guarantor Address</label>
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none text-gray-900 font-medium"
                        defaultValue="|"
                    />
                </div>

                {/* Guarantor BVN */}
                <div className="border border-gray-200 rounded-xl px-4 py-2 h-16">
                    <label className="text-xs text-gray-500 block mb-1">Guarantor BVN</label>
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none text-gray-900 font-medium"
                        defaultValue="|"
                    />
                </div>

                {/* Guarantor ID Upload */}
                <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                            <CloudUpload size={20} />
                        </div>
                        <div>
                            <p className="text-gray-900 text-sm font-medium">Guarantor ID</p>
                            <p className="text-gray-400 text-xs">PDF format • Max. 5MB</p>
                        </div>
                    </div>
                    <button className="bg-black text-white text-xs px-4 py-2 rounded-lg font-medium">
                        Upload
                    </button>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center justify-center gap-2 py-2">
                    <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                    </div>
                    <span className="text-gray-500 text-xs">I agreed with the Terms and Condition</span>
                </div>

                {/* Submit Button */}
                <Button
                    onClick={handleSubmit}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-bold text-base"
                >
                    Submit
                </Button>
            </div>

            {/* Success Modal */}
            <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
                <DialogContentMobile className="w-[85%] max-w-[320px] bg-white rounded-3xl border-none shadow-2xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                        {/* Particles */}
                        <div className="absolute top-0 right-10 w-2 h-2 bg-green-200 rounded-full animate-pulse" />
                        <div className="absolute top-4 left-4 w-2 h-2 bg-green-200 rounded-full animate-pulse delay-75" />
                        <div className="absolute bottom-10 right-0 w-2 h-2 bg-green-200 rounded-full animate-pulse delay-150" />
                        <div className="absolute bottom-0 left-10 w-2 h-2 bg-green-200 rounded-full animate-pulse delay-200" />

                        {/* Success Icon */}
                        <div className="w-24 h-24 bg-[#4ade80] rounded-full flex items-center justify-center relative">
                            {/* Wavy border effect */}
                            <div className="absolute inset-0 rounded-full border-4 border-white border-dashed opacity-50 animate-spin-slow"></div>
                            <Check className="w-12 h-12 text-white stroke-[4]" />
                        </div>
                    </div>

                    <h2 className="font-bold text-gray-900 text-lg mb-8">Loan Approved</h2>

                    <Button
                        className="w-full h-12 bg-[#92400e] hover:bg-[#78350f] text-white rounded-full font-medium"
                        onClick={() => router.push('/mobile/products')}
                    >
                        Submit
                    </Button>
                </DialogContentMobile>
            </Dialog>
        </div>
    );
}
