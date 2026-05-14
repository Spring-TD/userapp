"use client"

type EmailVerificationProgressProps = {
  progress: number
}

export function EmailVerificationProgress({ progress }: EmailVerificationProgressProps) {
  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="space-y-4">
        <h1 className="text-xl font-medium">{progress < 100 ? "Verifying your email..." : "Email verified!"}</h1>

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
