"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function EmailVerificationProgress() {
  const [progress, setProgress] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Simulate verification progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          // Redirect to success page after completion
          setTimeout(() => {
            router.push("/verify-success")
          }, 500)
          return 100
        }
        return prev + 20
      })
    }, 800)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="space-y-4">
        <h1 className="text-xl font-medium">Verifying your email</h1>

        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: "#74612F",
              }}
            />
          </div>
          <div className="text-right text-sm font-medium text-muted-foreground">{progress}%</div>
        </div>
      </div>
    </div>
  )
}
