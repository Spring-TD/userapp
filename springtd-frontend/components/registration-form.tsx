"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("[v0] Registration form submitted:", formData)

    // Redirect to email verification instruction page
    router.push("/verify-email")
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-balance">Create your account</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="firstName" className="sr-only">
            First name
          </Label>
          <Input
            id="firstName"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <Label htmlFor="lastName" className="sr-only">
            Last name
          </Label>
          <Input
            id="lastName"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
            className="h-12"
          />
        </div>

        <div>
          <Label htmlFor="country" className="sr-only">
            Country
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us">United States</SelectItem>
              <SelectItem value="ca">Canada</SelectItem>
              <SelectItem value="uk">United Kingdom</SelectItem>
              <SelectItem value="au">Australia</SelectItem>
              <SelectItem value="de">Germany</SelectItem>
              <SelectItem value="fr">France</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            className="h-12"
          />
        </div>

        <div className="relative">
          <Label htmlFor="password" className="sr-only">
            Create a password
          </Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            className="h-12 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <Label htmlFor="confirmPassword" className="sr-only">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className="h-12 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-start space-x-2 text-sm">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
            I agree to SpringTD{" "}
            <Link href="#" className="hover:underline" style={{ color: "#74612F" }}>
              Merchant Service Agreement
            </Link>
            , and the collection and processing of my personal data in accordance with SpringTD{" "}
            <Link href="#" className="hover:underline" style={{ color: "#74612F" }}>
              Privacy Notice
            </Link>
            .
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-white hover:opacity-90"
          style={{ backgroundColor: "#74612F" }}
          disabled={!formData.agreeToTerms || isSubmitting}
        >
          {isSubmitting ? "Creating account..." : "Create my account"}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <span>OR</span>
        </div>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Have an account? </span>
          <Link href="/login" className="hover:underline" style={{ color: "#74612F" }}>
            Sign In
          </Link>
        </div>
      </form>
    </div>
  )
}
