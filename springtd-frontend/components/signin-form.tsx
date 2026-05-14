"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/hooks/useAuth"

export function SigninForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  const { signin } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling

    // Check if rate limited
    if (rateLimited) {
      toast.warning(`Please wait ${retryAfter} seconds before trying again`, {
        position: "top-center",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Use unified auth flow so tokens are stored consistently
      await signin(formData.email, formData.password)
      toast.success("Signin successful 🎉")

      // Only navigate on success
      setTimeout(() => {
        router.push("/dashboard/compliance")
      }, 500)
    } catch (err: any) {
      // Check for rate limiting (429 status)
      if (err?.response?.status === 429) {
        const retryTime = parseInt(err?.response?.headers?.['retry-after'] || '60', 10)
        setRateLimited(true)
        setRetryAfter(retryTime)

        toast.error(`🚫 Too many login attempts. Please wait ${retryTime} seconds before trying again.`, {
          position: "top-center",
          autoClose: 10000,
        })

        // Auto-reset rate limit after the specified time
        setTimeout(() => {
          setRateLimited(false)
          setRetryAfter(0)
        }, retryTime * 1000)

        setIsSubmitting(false)
        return
      }

      // Don't navigate on error, just show the message
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Signin failed"

      // Check if it's an email verification or account pending issue
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        if (errorMsg.toLowerCase().includes("pending")) {
          toast.error("⏳ Your account is pending email verification. Please check your email inbox and verify your account before signing in.", {
            position: "top-center",
            autoClose: 8000,
          })
        } else if (errorMsg.toLowerCase().includes("verify") || errorMsg.toLowerCase().includes("verification")) {
          toast.error("⚠️ Please verify your email before signing in. Check your inbox for the verification link.", {
            position: "top-center",
            autoClose: 7000,
          })
        } else if (errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("incorrect")) {
          toast.error("❌ Invalid email or password. Please check your credentials.", {
            position: "top-center",
            autoClose: 5000,
          })
        } else {
          toast.error(`❌ ${errorMsg}`, {
            position: "top-center",
            autoClose: 6000,
          })
        }
      } else {
        toast.error(errorMsg, {
          position: "top-center",
          autoClose: 5000,
        })
      }

      // Keep the form state so user can try again
      setIsSubmitting(false)
      return // Explicitly return to prevent any navigation
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full px-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-balance">Sign in to your account</h1>
        </div>

        {/* Rate limit warning banner */}
        {rateLimited && (
          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Too many login attempts. Please wait <strong>{retryAfter}</strong> seconds before trying again.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full h-14"
              required
              disabled={rateLimited}
            />
          </div>

          <div className="relative">
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full h-14"
              required
              disabled={rateLimited}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium hover:underline"
              style={{ color: "#74612F" }}
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-white hover:opacity-90"
            style={{ backgroundColor: rateLimited ? "#9CA3AF" : "#74612F" }}
            disabled={isSubmitting || rateLimited}
          >
            {rateLimited ? `Wait ${retryAfter}s...` : isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">If you don't have an account </span>
            <Link href="/signup" className="hover:underline" style={{ color: "#74612F" }}>
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
