"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { WEBSITE_URL_PREFIX } from "@/lib/websiteUrl"

interface OnboardingProfileProps {
    onNext: () => void
    onBack: () => void
}

export function OnboardingProfile({ onNext, onBack }: OnboardingProfileProps) {
    const [website, setWebsite] = useState(WEBSITE_URL_PREFIX)
    return (
        <div className="w-full max-w-[1000px] h-fit bg-gray-100/50 p-8 rounded-xl border border-gray-100">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Profile</h1>
                <p className="text-xs text-gray-500">Fill in the required information below to create your business account.</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Left Column */}
                <div className="space-y-4">
                    <Input
                        placeholder="Company Name*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Company Address*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Textarea
                        placeholder="Business Description*"
                        className="min-h-[140px] bg-white border-none shadow-sm text-base rounded-lg resize-none p-4"
                    />
                    <Input
                        placeholder="Customer base*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Industry of operation*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Contact phone*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <Input
                        placeholder="Customer support email*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Customer support phone*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Link to terms and condition*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        type="url"
                        placeholder="example.com"
                        value={website}
                        onChange={(e) => {
                            const v = e.target.value
                            const next = (v.startsWith("https://") || v.startsWith("http://") || v === "") ? v : WEBSITE_URL_PREFIX + v
                            setWebsite(next)
                        }}
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="LinkedIn page*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Social media link*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Link to privacy Policy*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                    <Input
                        placeholder="Link to terms and condition*"
                        className="h-[60px] bg-white border-none shadow-sm text-base rounded-lg"
                    />
                </div>
            </div>

            <div className="w-full">
                <Button
                    onClick={onNext}
                    className="w-full h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md hover:shadow-lg transition-all rounded-lg text-base font-medium"
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
