"use client"

import { Button } from "@/components/ui/button"
import { SquarePen, Copy, Navigation } from "lucide-react"
import { toast } from "sonner"

interface OnboardingContinueAgreementProps {
    onNext: () => void
    onBack?: () => void
}

export function OnboardingContinueAgreement({ onNext }: OnboardingContinueAgreementProps) {
    const agreementUrl = "https://air-sign.vercel.app/create-account"

    const handleCopy = () => {
        navigator.clipboard.writeText(agreementUrl)
        toast.success("URL copied to clipboard")
    }

    const handleAgreementClick = () => {
        // Open the URL in a new tab
        window.open(agreementUrl, "_blank", "noopener,noreferrer")
        // Proceed to next step
        onNext()
    }

    return (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500 max-w-[500px] w-full bg-gray-100/50 p-8 rounded-xl border border-gray-100">
            <div className="w-16 h-16 bg-[#7C3AED] rounded-full flex items-center justify-center mb-6 shadow-md">
                <SquarePen className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">Continue to Sign Agreement</h1>

            <p className="text-xs text-gray-500 mb-8 max-w-sm leading-relaxed">
                Click or copy the URL below to continue to sign MSA (Merchant Service Agreement).
            </p>

            <div className="flex w-full items-center gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center shadow-sm border border-purple-100">
                    <Navigation className="w-5 h-5 text-[#7C3AED] rotate-45 mb-1 mr-1" />
                </div>

                <div className="flex-grow bg-[#F3F4F6] rounded-xl p-3 px-4 relative border border-transparent">
                    <div className="flex flex-col items-start text-left">
                        <span className="text-xs text-gray-400 mb-0.5">Agreement URL</span>
                        <div className="font-bold text-sm text-gray-900 w-full truncate pr-6">
                            {agreementUrl}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-[#7C3AED] hover:bg-gray-200"
                        onClick={handleCopy}
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Actually the URL in the code should be the one requested: https://air-sign.vercel.app/create-account 
               The image shows 'sign.signario...' but user said 'https://air-sign.vercel.app/create-account'. I will use the user's URL.
           */}

            <p className="text-[10px] text-gray-500 mb-8 max-w-sm leading-relaxed px-4">
                Upon clicking <span className="font-bold text-[#7C3AED]">Continue to sign</span>, you will be redirected to a web port where you can read and sign the agreement
            </p>

            <Button
                onClick={handleAgreementClick}
                className="w-full h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base shadow-md hover:shadow-lg transition-all"
            >
                Agreement
            </Button>
        </div>
    )
}
