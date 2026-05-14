"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export function WelcomeScreen() {
  const router = useRouter()

  const handleProceed = () => {
    // Navigate to dashboard or main app

    // For now, redirect back to signin as a placeholder
    router.push("/signin")
  }

  return (
    <div className="flex items-center justify-center h-screen px-6">
      <Card className="w-full max-w-md min-h-80 bg-white shadow-lg">
        <CardContent className="p-12 text-center space-y-8 flex flex-col justify-center h-full">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium text-balance">
              Welcome to <span className="font-bold text-slate-800">SpringTD</span>!
            </h1>
            <p className="text-muted-foreground">Thank you signing up</p>
          </div>

          <Button
            onClick={handleProceed}
            className="w-3/4 mx-auto h-10 text-white hover:opacity-90"
            style={{ backgroundColor: "#74612F" }}
          >
            Proceed
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
