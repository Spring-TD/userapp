"use client"

import type React from "react"
import { AuthHeader } from "@/components/auth-header"

interface AuthLayoutProps {
    children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
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
                    maskImage: 'linear-gradient(to bottom, white, transparent)' // Subtle fade if needed, but the image shows full grid
                }}
            />
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(255,255,255,1)_100%)] pointer-events-none" />

            <AuthHeader />

            <main className="w-full max-w-[480px] relative z-10">
                {children}
            </main>
        </div>
    )
}
