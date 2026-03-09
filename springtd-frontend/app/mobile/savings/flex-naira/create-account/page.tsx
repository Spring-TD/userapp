'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreateAccountPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white p-6 flex flex-col">
            {/* Header */}
            <div className="pt-4 mb-2">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-900" />
                </button>
            </div>

            {/* Icon & Title */}
            <div className="mb-8 mt-4">
                <div className="w-14 h-14 bg-[#06B6D4] rounded-full flex items-center justify-center mb-6">
                    <Landmark className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    Create an Account Number<br />
                    To receive cash into your Flex Naira<br />
                    Account
                </h1>
            </div>

            {/* Form */}
            <div className="space-y-8">
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium ml-1">Select Your Preferred Bank</label>
                    <div className="relative">
                        <Input
                            type="text"
                            defaultValue="Preferred Bank"
                            className="h-14 bg-gray-50 border-none rounded-xl text-gray-500 font-medium px-4"
                            readOnly
                        />
                    </div>
                </div>

                <Button className="w-full h-14 bg-[#C026D3] hover:bg-[#A21CAF] text-white rounded-full font-semibold text-lg">
                    Create Account
                </Button>
            </div>
        </div>
    );
}
