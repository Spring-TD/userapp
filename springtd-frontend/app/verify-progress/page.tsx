"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EmailVerificationProgress } from "@/components/email-verification-progress"

export default function VerifyProgressPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const verified = localStorage.getItem("verified")

    if (verified === "true") {
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(interval)
            localStorage.removeItem("verified")
            setTimeout(() => router.replace("/verify-success"), 500)
            return 100
          }
          return p + 20
        })
      }, 600)

      return () => clearInterval(interval)
    }
  }, [router])

  return (
    <main className="flex items-center justify-center px-6 py-48">
      <EmailVerificationProgress progress={progress} />
    </main>
  )
}
