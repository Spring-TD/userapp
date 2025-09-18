"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import api from "@/lib/api"


export function RegistrationForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

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

  // Country mapping
const countryMap: Record<string, string> = {
  us: "United States",
  ca: "Canada",
  uk: "United Kingdom",
  au: "Australia",
  de: "Germany",
  fr: "France",
}

const getCountryName = (code: string): string => {
  return countryMap[code] || code // fallback if not found
}


 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (formData.password !== formData.confirmPassword) {
    toast.error("Passwords do not match")
    return
  }

  if (!formData.agreeToTerms) {
    toast.error("You must accept the terms to continue")
    return
  }

  setIsSubmitting(true)

  try {
    // map camelCase → snake_case for backend
    const payload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      country: getCountryName(formData.country), // convert code to full name
      email: formData.email,
      phone: formData.phoneNumber,
      password: formData.password,
    }

    const response = await api.post("/auth/register", payload)

    toast.success("Registration successful! Please verify your email.")
    router.push("/verify-email")
  } catch (error: any) {
    console.error("Registration error:", error.response?.data || error.message)
    toast.error(
      error.response?.data?.error || 
      error.response?.data?.message || 
      "Registration failed. Try again."
    )
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-balance">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* First Name */}
          <Input
            id="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          {/* Last Name */}
          <Input
            id="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          {/* Country */}
          <Select
            value={formData.country}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="w-full h-[60px] text-base">
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

          {/* Email */}
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          {/* Phone Number */}
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="Phone number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
            className="w-full h-[60px] text-base"
          />

          {/* Password */}
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

          {/* Confirm Password */}
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
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

          {/* Terms */}
          <div className="flex items-start gap-3 text-sm">
            <Checkbox
              id="terms"
              checked={formData.agreeToTerms}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
              }
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

          {/* Submit */}
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
