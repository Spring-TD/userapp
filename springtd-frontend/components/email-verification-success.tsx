"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"

export function EmailVerificationSuccess() {
  const router = useRouter()

  const handleContinue = () => {
    router.push("/welcome")
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="flex justify-center">
        <Image
          src="/images/file-upload-states.png"
          alt="Success checkmark"
          width={64}
          height={64}
          className="h-16 w-16"
        />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Email verified!</h1>
        <p className="text-sm text-muted-foreground">You've successfully created your account</p>
      </div>

      <Button
        onClick={handleContinue}
        className="w-full h-12 text-white hover:opacity-90"
        style={{ backgroundColor: "#74612F" }}
      >
        Continue
      </Button>
    </div>
  )
}
