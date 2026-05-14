"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"
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

export function SpringRegistrationForm({ onSubmit, isSubmitting }: RegistrationFormProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [formData, setFormData] = useState({
        fullName: "",
        country: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        agreeToTerms: false,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Split full name into first and last name for the backend
        const names = formData.fullName.trim().split(" ")
        const firstName = names[0] || ""
        const lastName = names.slice(1).join(" ") || "" // Handle if only one name provided

        await onSubmit({
            ...formData,
            firstName,
            lastName,
        })
    }

    return (
        <div className="w-full space-y-6">
            <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold text-gray-900">Create your account</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                    <Input
                        id="fullName"
                        placeholder="Merchant Full Name*"
                        value={formData.fullName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg text-base"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <Input
                        id="email"
                        type="email"
                        placeholder="Merchant Email*"
                        value={formData.email}
                        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                        className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg text-base"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="Merchant Phone Number*"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                        className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg text-base"
                        required
                    />
                </div>

                <div className="space-y-1">
                    <Select
                        value={formData.country}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, country: value }))}
                    >
                        <SelectTrigger className="w-full h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg text-base text-gray-500 data-[state=checked]:text-gray-900">
                            <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="au">Australia</SelectItem>
                            <SelectItem value="de">Germany</SelectItem>
                            <SelectItem value="fr">France</SelectItem>
                            <SelectItem value="ng">Nigeria</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1 relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password*"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg pr-10 text-base"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>

                <div className="space-y-1 relative">
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password*"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg pr-10 text-base"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>

                <div className="flex items-start gap-3 pt-2">
                    <Checkbox
                        id="terms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))}
                        className="mt-1 rounded border-gray-300 data-[state=checked]:bg-[#7C3AED] data-[state=checked]:border-[#7C3AED]"
                    />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        I accept the SpringTD <Link href="#" className="font-semibold text-gray-900 hover:underline">Merchant Service Agreement</Link> and the use of my personal data as outlined in the SpringTD <Link href="#" className="font-semibold text-gray-900 hover:underline">Privacy Notice</Link>.
                    </p>
                </div>

                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base shadow-md hover:shadow-lg transition-all"
                >
                    {isSubmitting ? "Creating account..." : "Create my account"}
                </Button>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-300 text-xs uppercase">OR</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="text-center text-sm">
                    <span className="text-gray-500">Have an account? </span>
                    <Link href="/spring/signin" className="text-[#7C3AED] font-semibold hover:underline">
                        Sign In
                    </Link>
                </div>
            </form>
        </div>
    )
}
