"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface OnboardingSuccessProps {
    onFinish: () => void
}

export function OnboardingSuccess({ onFinish }: OnboardingSuccessProps) {
    return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <div className="w-8 h-8 bg-[#22C55E] rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-5 h-5 text-white stroke-[3px]" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile is created</h1>

            <p className="text-sm text-gray-500 mb-8 max-w-sm">
                You've successfully created your Merchant account
            </p>

            <Button
                onClick={onFinish}
                className="w-full h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base shadow-md hover:shadow-lg max-w-xs min-w-[200px]"
            >
                Continue
            </Button>
        </div>
    )
}
