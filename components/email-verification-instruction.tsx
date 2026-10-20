"use client"
import Image from "next/image"
import { apiClient } from "@/lib/api"
import { ENDPOINTS } from "@/lib/endpoints"

type Props = {
  email: string
  onResend: () => Promise<void>
  message: string
  isResending: boolean
}

export function EmailVerificationInstruction({ email, onResend, message, isResending }: Props) {
  const handleResend = async () => {
    if (onResend) {
      try {
        await onResend()
      } catch (err) {
        console.error("Resend failed (onResend)", err)
      }
      return
    }

    // fallback: use auth proxy resend OTP (consolidated Auth class)
    if (!email) return
    try {
      await apiClient.post(
        ENDPOINTS.auth.otp.resendEmail,
        { identifier: email, channel: "email", purpose: "verification" },
        { includeAuth: false }
      )
    } catch (err) {
      console.error("Resend failed (fallback)", err)
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Image
            src="/images/sms-notification.png"
            alt="Email notification"
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Please check your email</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            {email ? `We sent an OTP to the ${email}.` : "Loading your email..."}
          </p>
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Didn’t receive email? </span>
          <button
            onClick={handleResend}
            disabled={isResending}
            className="hover:underline disabled:opacity-50"
            style={{ color: "#7C3AED" }}
          >
            {isResending ? "Sending..." : "Click to resend"}
          </button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  )
}
