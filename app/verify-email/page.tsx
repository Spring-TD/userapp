"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"
import { Button } from "@/components/ui/button"
import { toast } from "react-toastify"
import { AuthFormSkeleton } from "@/components/ui/app-loading-skeleton"

function VerifyEmailContent() {
  const [email, setEmail] = useState<string>("")
  const [isResending, setIsResending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get email from sessionStorage (more secure than URL params)
    const pendingEmail = sessionStorage.getItem("pendingEmail")

    if (pendingEmail) {
      setEmail(pendingEmail)
    }
  }, [router, searchParams])

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== "")) {
      handleVerifyOTP(newOtp.join(""))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace - move to previous input
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("")
      setOtp(newOtp)
      inputRefs.current[5]?.focus()
      // Auto-submit after paste
      handleVerifyOTP(pastedData)
    }
  }

  const handleResend = async () => {
    if (!email) return
    try {
      setIsResending(true)
      await apiClient.post(
        ENDPOINTS.auth.otp.resendEmail,
        { identifier: email, channel: "email", purpose: "verification" },
        { includeAuth: false }
      )
      toast.success("✅ A new verification code has been sent to your email.")
    } catch (err: any) {
      console.error("Resend request failed", err)
      const errorMsg = err?.response?.data?.error || err?.message || "Failed to resend verification code"
      toast.error(`❌ ${errorMsg}`)
    } finally {
      setIsResending(false)
    }
  }

  const handleVerifyOTP = async (otpCode?: string) => {
    const codeToUse = otpCode || otp.join("")

    if (codeToUse.length !== 6) {
      toast.error("⚠️ Please enter the complete 6-digit code.")
      return
    }

    if (!email) {
      toast.error("⚠️ Email not found. Please go back to signup.")
      return
    }

    try {
      setIsVerifying(true)
      const response = await apiClient.post<any>(ENDPOINTS.auth.verify.emailOtp, {
        email,
        otp: codeToUse,
      })

      // Store tokens in cookies so they persist across reloads
      const data = response.data as any
      if (data?.data?.accessToken) {
        const { setSecureTokens } = await import("@/lib/tokenManager")
        await setSecureTokens(data.data.accessToken, data.data.refreshToken)
      }

      // Clear pending email from sessionStorage
      sessionStorage.removeItem("pendingEmail")
      // Signal verify-success to clear tokens and ask user to sign in (only when coming from here)
      sessionStorage.setItem("verifiedJustNow", "1")

      toast.success("✅ Email verified successfully!")

      // Redirect to verify-success page
      setTimeout(() => router.push("/verify-success"), 500)
    } catch (err: any) {
      console.error("Email verification failed", err)
      const errorMsg = err?.response?.data?.error || "Invalid or expired verification code"
      toast.error(`❌ ${errorMsg}`)
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* OTP Input Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          {/* Icon and Title */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/images/sms-notification.png"
              alt="Email notification"
              width={64}
              height={64}
              className="h-16 w-16 mb-4"
            />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Please check your email</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              {email ? `We sent an OTP to ${email}` : "Loading your email..."}
            </p>
          </div>

          <h3 className="text-center text-lg font-medium text-gray-900 dark:text-white mb-4">
            Enter Verification Code
          </h3>

          <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg 
                         focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 focus:outline-none
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
              />
            ))}
          </div>

          <Button
            onClick={() => handleVerifyOTP()}
            disabled={isVerifying || otp.some(digit => digit === "")}
            className="w-full h-12 text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#7C3AED" }}
          >
            {isVerifying ? "Verifying..." : "Verify Email"}
          </Button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Didn't receive the code?{" "}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-[#7C3AED] hover:underline font-medium disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend Code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
          <AuthFormSkeleton />
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
