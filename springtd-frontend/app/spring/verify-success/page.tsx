"use client"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

export default function VerifySuccessPage() {
    const router = useRouter()

    return (
        <AuthLayout>
            <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <div className="w-8 h-8 bg-[#22C55E] rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white stroke-[3px]" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h1>

                <p className="text-sm text-gray-500 mb-8 text-center">
                    You've successfully created your Merchant account
                </p>

                <Button
                    onClick={() => router.push("/spring/onboarding")}
                    className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base shadow-md hover:shadow-lg max-w-xs"
                >
                    Continue
                </Button>
            </div>
        </AuthLayout>
    )
}
