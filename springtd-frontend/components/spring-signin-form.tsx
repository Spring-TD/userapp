"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/hooks/useAuth"

export function SpringSigninForm() {
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

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (rateLimited) {
            toast.warning(`Please wait ${retryAfter} seconds before trying again`)
            return
        }

        setIsSubmitting(true)

        try {
            await signin(formData.email, formData.password)
            toast.success("Welcome back! 👋")

            setTimeout(() => {
                router.push("/dashboard/merchant")
            }, 500)
        } catch (err: any) {
            // Existing error handling logic preserved...
            if (err?.response?.status === 429) {
                const retryTime = parseInt(err?.response?.headers?.['retry-after'] || '60', 10)
                setRateLimited(true)
                setRetryAfter(retryTime)
                toast.error(`Too many attempts. Please wait ${retryTime}s.`)

                setTimeout(() => {
                    setRateLimited(false)
                    setRetryAfter(0)
                }, retryTime * 1000)

                setIsSubmitting(false)
                return
            }

            const errorMsg = err?.response?.data?.message || err?.message || "Signin failed"
            toast.error(errorMsg)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full space-y-8">
            <div className="text-center space-y-3">
                <h1 className="text-[32px] font-bold tracking-tight text-gray-900">Welcome Back</h1>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                    You need to have registered and verified as merchant,
                    <br /> before you can proceed.
                </p>
            </div>

            {rateLimited && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Please wait {retryAfter}s before retrying.</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                    <div className="space-y-1">
                        <Input
                            id="email"
                            type="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                            className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg text-base"
                            required
                            disabled={isSubmitting || rateLimited}
                        />
                    </div>

                    <div className="space-y-1 relative">
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                                className="h-14 bg-white border-gray-200 focus:border-[#7C3AED] focus:ring-[#7C3AED]/20 rounded-lg pr-10 text-base"
                                required
                                disabled={isSubmitting || rateLimited}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>

                        <div className="pt-2">
                            <Link
                                href="/forgot-password"
                                className="text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium transition-colors"
                            >
                                Forget Password?
                            </Link>
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-14 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg text-base transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isSubmitting || rateLimited}
                >
                    {isSubmitting ? "Logging in..." : "Log in"}
                </Button>

                <div className="text-center text-xs text-gray-500 mt-6">
                    If you don't have an account <Link href="/spring/signup" className="text-[#8B5CF6] font-semibold hover:underline">Sign Up</Link>
                </div>
            </form>
        </div>
    )
}
