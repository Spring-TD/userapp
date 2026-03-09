"use client"

import { AuthLayout } from "@/components/auth-layout"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function VerifyProgressPage() {
    const [progress, setProgress] = useState(0)
    const router = useRouter()

    useEffect(() => {
        // Simulate verification progress
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress >= 100) {
                    clearInterval(timer)
                    return 100
                }
                // Random increment to simulate network activity
                const diff = Math.random() * 20
                return Math.min(oldProgress + diff, 100)
            })
        }, 200)

        // Redirect when done (simulating success after progress)
        // In real app, this page might poll an API status
        if (progress === 100) {
            const redirectTimer = setTimeout(() => {
                router.push("/spring/verify-success")
            }, 500)
            return () => clearTimeout(redirectTimer)
        }

        return () => clearInterval(timer)
    }, [progress, router])

    return (
        <AuthLayout>
            <div className="w-full flex flex-col items-center">
                <div className="w-full max-w-sm">
                    <div className="flex justify-between text-xs font-medium text-gray-900 mb-2">
                        <span>Verifying your email</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#7C3AED] transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </AuthLayout>
    )
}
