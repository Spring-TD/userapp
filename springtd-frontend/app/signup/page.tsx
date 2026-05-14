"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { RegistrationForm } from "@/components/registration-form"
import { toast } from "react-toastify"
import api from "@/lib/api"

export default function SignupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (formData: {
    firstName: string
    lastName: string
    country: string
    email: string
    phoneNumber: string
    password: string
    confirmPassword: string
    agreeToTerms: boolean
  }) => {
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    // Validate terms agreement
    if (!formData.agreeToTerms) {
      toast.error("You must accept the terms and conditions")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare the registration data
      const registrationData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        country: formData.country,
        email: formData.email,
        phone: formData.phoneNumber.startsWith('+') ? formData.phoneNumber : `+${formData.phoneNumber}`,
        password: formData.password,
        user_merchant_id: `merchant_${Date.now()}`,
      }

      console.log("Sending registration data:", registrationData)

      // Call the registration API - production endpoint
      const response = await api.post("/auth/register/merchant", registrationData)

      console.log("Registration successful:", response.data)

      if (response.data) {
        // Store email in sessionStorage for verification flow (more secure than URL params)
        sessionStorage.setItem("pendingEmail", formData.email)
        toast.success("Account created! Please check your email for the OTP code.")
        // Redirect to verify-email page (email stored securely in sessionStorage)
        router.push("/verify-email")
      }
    } catch (error: any) {
      console.error("Full registration error:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        `Failed to create account. Status: ${error.response?.status || 'Unknown'}`
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-12 relative overflow-y-auto">
      <div className="flex justify-center w-full mb-8 mt-4">
        <span className="text-2xl font-bold text-[#9A813F]">Product Builder</span>
      </div>
      <div className="w-full max-w-lg px-4">
        <RegistrationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  )
}
