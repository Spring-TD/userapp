"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import api from "@/lib/api"
import { Eye, EyeOff } from "lucide-react"

function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error("Invalid or missing reset token")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    setIsSubmitting(true)

    try {
      await api.post("/api/v1/password/reset", {
        token,
        newPassword: formData.password
      })
      
      setIsSuccess(true)
      toast.success("Password reset successfully")
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/signin")
      }, 3000)
    } catch (error: any) {
      console.error("Reset password error:", error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to reset password"
      toast.error(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Password reset</h1>
          <p className="text-gray-500">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
        </div>
        
        <Link href="/signin">
          <Button 
            className="w-full h-12 text-white hover:opacity-90"
            style={{ backgroundColor: "#74612F" }}
          >
            Sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Set new password</h1>
        <p className="text-gray-500 text-sm">
          Your new password must be different from previously used passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div className="relative space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create new password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="h-14 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="relative space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="h-14 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-white hover:opacity-90"
          style={{ backgroundColor: "#74612F" }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 relative">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>

      <div className="w-full max-w-lg px-4">
        <Suspense fallback={
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9A813F]"></div>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
