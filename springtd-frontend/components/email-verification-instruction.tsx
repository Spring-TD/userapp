"use client"

import { useState } from "react"
import Image from "next/image"

export function EmailVerificationInstruction() {
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    setIsResending(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsResending(false)
    console.log("[v0] Resending verification email")
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
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
        <h1 className="text-2xl font-semibold text-balance">Please check your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a verification link to the email address you registered your SpringTD account with
        </p>
      </div>

      <div className="text-sm">
        <span className="text-muted-foreground">Didn't receive email? </span>
        <button
          onClick={handleResend}
          disabled={isResending}
          className="hover:underline disabled:opacity-50"
          style={{ color: "#74612F" }}
        >
          {isResending ? "Sending..." : "Click to resend"}
        </button>
      </div>
    </div>
  )
}
