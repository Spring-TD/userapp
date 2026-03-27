"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface OnboardingIntentProps {
    onNext: (value: string) => void
}

export function OnboardingIntent({ onNext }: OnboardingIntentProps) {
    return (
        <div className="w-full max-w-[500px] bg-gray-100/50 p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Profile</h1>
                <p className="text-xs text-gray-500">Fill in the required information below to create your business account.</p>
            </div>

            <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">What are you looking for?*</label>
                    <Select>
                        <SelectTrigger className="w-full !h-[60px] flex items-center bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 hover:bg-gray-50 text-base">
                            <SelectValue placeholder="Select what you want*" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="register">Register a new Business</SelectItem>
                            <SelectItem value="onboard">Onboard existing Business</SelectItem>
                            <SelectItem value="freelance">Freelance / Sole Proprietorship</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex gap-4 mt-8">
                <Button
                    variant="outline"
                    className="flex-1 h-[60px] bg-[#444444] text-white hover:bg-gray-800 border-none hover:text-white"
                >
                    Back
                </Button>
                <Button
                    onClick={() => onNext("register")}
                    className="flex-1 h-[60px] bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-md hover:shadow-lg transition-all"
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
