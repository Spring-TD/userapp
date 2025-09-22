"use client"

import { useState } from "react"
import Image from "next/image"

export function EmailVerificationInstruction() {
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    setIsResending(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsResending(false)
  }

  return (
    <div className="flex items-center justify-center px-4 py-38">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <Image
            src="/images/sms-notification.png"
            alt="Email notification"
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>

        {/* Heading & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Please check your email</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed">
            We sent a verification link to the email address you registered your SpringTD account with.
          </p>
        </div>

        {/* Resend Action */}
        <div className="text-sm">
          <span className="text-muted-foreground">Didn’t receive email? </span>
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
    </div>
  )
}
