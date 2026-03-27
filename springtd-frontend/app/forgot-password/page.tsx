"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import api from "@/lib/api"
import { ArrowLeft } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await api.post("/api/v1/password/forgot", { email })
      setIsSubmitted(true)
      toast.success("Reset link sent to your email")
    } catch (error: any) {
      console.error("Forgot password error:", error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to send reset link"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>

      <div className="w-full max-w-lg px-4">
        {isSubmitted ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-gray-500">
                We have sent a password reset link to <span className="font-medium text-gray-900">{email}</span>
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Did not receive the email? Check your spam folder or{" "}
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="text-[#74612F] font-medium hover:underline disabled:opacity-50"
                >
                  resend email
                </button>
              </p>
              
              <Link href="/signin">
                <Button className="w-full h-12" variant="outline">
                  Back to Sign in
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="text-gray-500 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-white hover:opacity-90"
                style={{ backgroundColor: "#74612F" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending link..." : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link 
                  href="/signin" 
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign in
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
