"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { EmailVerificationSuccess } from "@/components/email-verification-success"
import { clearSecureTokens } from "@/lib/tokenManager"
import { ProductAuthShell } from "@/components/product-auth-shell"

export default function VerifySuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const fromVerification = typeof window !== "undefined" && sessionStorage.getItem("verifiedJustNow") === "1"
    if (fromVerification) {
      sessionStorage.removeItem("verifiedJustNow")
      clearSecureTokens()
    }
  }, [])

  const handleContinue = () => {
    sessionStorage.removeItem("verifiedJustNow")
    clearSecureTokens()
    router.push("/signin")
  }

  return (
    <ProductAuthShell contentClassName="max-w-md">
      <EmailVerificationSuccess onContinue={handleContinue} />
    </ProductAuthShell>
  )
}
