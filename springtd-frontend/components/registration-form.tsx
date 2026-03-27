"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Eye, EyeOff, Check, X } from "lucide-react"
import Link from "next/link"

type RegistrationFormProps = {
  onSubmit: (formData: {
    firstName: string
    lastName: string
    country: string
    email: string
    phoneNumber: string
    password: string
    confirmPassword: string
    agreeToTerms: boolean
  }) => Promise<void>
  isSubmitting: boolean
}

export function RegistrationForm({ onSubmit, isSubmitting }: RegistrationFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password validation helper
  const validatePassword = (password: string) => {
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[@$!%*?&]/.test(password)
    const isLongEnough = password.length >= 8

    const requirements = [hasLowercase, hasUppercase, hasNumber, hasSpecial, isLongEnough]
    const strength = requirements.filter(Boolean).length
    const score = (strength / 5) * 100

    return {
      isValid: requirements.every(Boolean),
      score,
      strength
    }
  }

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    country: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const passwordValidation = validatePassword(formData.password)

  const getProgressColor = (score: number) => {
    if (score <= 40) return "bg-red-500"
    if (score <= 80) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = (score: number) => {
    if (score === 0) return ""
    if (score <= 40) return "Weak"
    if (score <= 80) return "Medium"
    return "Strong"
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-balance">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          <Input
            id="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          <Select
            value={formData.country}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="w-full !h-[60px] text-base flex items-center">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent className="w-full">
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="au">Australia</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
            </SelectContent>
          </Select>

          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          <Input
            id="phoneNumber"
            type="tel"
            placeholder="Phone number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          {/* Password */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full h-[60px] pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.password && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className={
                    passwordValidation.score <= 40 ? "text-red-500" :
                      passwordValidation.score <= 80 ? "text-yellow-500" : "text-green-500"
                  }>
                    {getStrengthText(passwordValidation.score)}
                  </span>
                  <span className="text-muted-foreground">{passwordValidation.score}%</span>
                </div>
                <Progress
                  value={passwordValidation.score}
                  className="h-2"
                  // Override the indicator color using child selector
                  indicatorClassName={getProgressColor(passwordValidation.score)}
                />
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full h-[60px] pr-12 text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {formData.password === formData.confirmPassword ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Passwords match
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    <X className="h-4 w-4" /> Passwords do not match
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 text-sm">
            <Checkbox
              id="terms"
              checked={formData.agreeToTerms}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))}
              className="mt-1 rounded-full"
            />
            <p className="text-[13px] font-medium leading-relaxed text-muted-foreground">
              I accept the SpringTD{" "}
              <Link href="#" className="hover:underline" style={{ color: "#74612F" }}>
                Merchant Service Agreement
              </Link>{" "}
              and the use of my personal data as outlined in the SpringTD{" "}
              <Link href="#" className="hover:underline" style={{ color: "#74612F" }}>
                Privacy Notice
              </Link>
              .
            </p>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/signin" className="hover:underline font-medium" style={{ color: "#74612F" }}>
              Sign in
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[60px] text-white hover:opacity-90 rounded-md cursor-pointer text-base"
          >
            {isSubmitting ? "Creating account..." : "Create my account"}
          </Button>
        </form>
      </div>
    </div>
  )
}
