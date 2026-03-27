"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

export function AuthHeader() {
    return (
        <header className="absolute top-0 left-0 right-0 w-full px-6 py-6 flex items-center justify-between z-10">
            <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#7C3AED]">Spring</span>
                <span className="text-2xl font-bold tracking-tight text-[#7C3AED]/70">TD</span>
            </Link>

            <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-white hover:bg-gray-50 border border-gray-100 shadow-sm text-sm font-medium text-gray-700 transition-colors">
                <span className="flex items-center justify-center w-5 h-5 overflow-hidden rounded-full bg-gray-100">
                    🇺🇸
                </span>
                <span>ENG</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
        </header>
    )
}
