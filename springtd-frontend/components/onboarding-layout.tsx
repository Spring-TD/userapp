"use client"

import type React from "react"
import { AuthHeader } from "@/components/auth-header"

interface OnboardingLayoutProps {
    children: React.ReactNode
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
    return (
        <div className="min-h-screen w-full relative bg-white flex flex-col items-center justify-center p-4">
            {/* Grid Background */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
          `,
                    backgroundSize: '4rem 4rem',
                }}
            />
            {/* Radial fade for better readability if needed, but keeping it subtle */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(255,255,255,0.8)_100%)] pointer-events-none" />

            <AuthHeader />

            {/* Container allowed to grow wider than auth pages */}
            <main className="w-full relative z-10 flex flex-col items-center justify-center my-20">
                {children}
            </main>
        </div>
    )
}
