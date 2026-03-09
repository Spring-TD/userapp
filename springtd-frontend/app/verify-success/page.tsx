"use client"

import { useEffect } from "react"
import Image from "next/image"
import { EmailVerificationSuccess } from "@/components/email-verification-success"
import { useRouter } from "next/navigation"

export default function VerifySuccessPage() {
  const router = useRouter()

  // Auto-redirect to signin after 3 seconds
  useEffect(() => {
    // Clear any verification tokens/data
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")

    const timer = setTimeout(() => {
      router.push("/signin")
    }, 3000) // 3 seconds

    return () => clearTimeout(timer)
  }, [router])

  const handleContinue = () => {
    // Clear any verification tokens/data
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    // Redirect to signin immediately on button click
    router.push("/signin")
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12 relative">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>
      <EmailVerificationSuccess onContinue={handleContinue} />
    </main>
  )
}
