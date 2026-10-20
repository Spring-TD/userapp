"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileEdit } from "lucide-react"

interface OnboardingAgreementProps {
    onNext: () => void
    onBack?: () => void
}

export function OnboardingAgreement({ onNext }: OnboardingAgreementProps) {
    return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 max-w-[500px] w-full bg-gray-100/50 p-8 rounded-xl border border-gray-100">
            <div className="w-16 h-16 bg-[#7C3AED] rounded-full flex items-center justify-center mb-6 shadow-md">
                <FileEdit className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">Agreement is Required</h1>

            <p className="text-xs text-gray-500 mb-8 max-w-sm leading-relaxed">
                Before you go forward, You are required to complete the contract process. Click Sign Agreement to continue
            </p>

            <div className="w-full space-y-2 mb-8 text-left">
                <Input
                    placeholder="Enter Email"
                    className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                />
                <p className="text-[10px] text-gray-500 pl-1">
                    Enter Email to receive Signed copy of contract
                </p>
            </div>

            <Button
                onClick={onNext}
                className="w-full h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base shadow-md hover:shadow-lg"
            >
                Agreement
            </Button>
        </div>
    )
}
