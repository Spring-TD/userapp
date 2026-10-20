"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import api from "@/lib/api"

// Only allow in development mode
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export default function TestBypassPage() {
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    // Block access in production
    if (IS_PRODUCTION) {
      setBlocked(true)
      toast.error("🚫 Test bypass is disabled in production")
    }
  }, [])

  if (blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">🚫 Access Denied</h2>
          <p className="text-gray-600">Test bypass is disabled in production.</p>
          <p className="text-gray-500 text-sm mt-2">Redirecting to signin...</p>
        </div>
      </div>
    )
  }

  const handleBypass = async () => {
    setLoading(true)
    try {
      // Call the bypass endpoint
      const response = await api.get("/api/v1/test/bypass-auth")

        if (response.data.success) {
        const { accessToken, refreshToken } = response.data.data

        const { setSecureTokens } = await import("@/lib/tokenManager")
        await setSecureTokens(accessToken, refreshToken)

        toast.success("🔓 Bypass successful!")
      }
    } catch (error: any) {
      console.error("Bypass error:", error)
      toast.error("Failed to get bypass tokens")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        {/* Development warning banner */}
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p className="font-bold">⚠️ Development Only</p>
          <p className="text-sm">This page is only available in development mode.</p>
        </div>
        
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            🔓 Test Bypass
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Skip authentication and get instant access to test other features
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleBypass}
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Getting Access..." : "🚀 Bypass & Enter Dashboard"}
          </button>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">
              What this does:
            </h3>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Generates valid JWT tokens without signup/signin</li>
              <li>• Stores tokens in localStorage</li>
              <li>• Redirects you to the dashboard</li>
              <li>• You can now test compliance, products, etc.</li>
            </ul>
          </div>

          <div className="text-center text-sm text-gray-500">
            <a
              href="/signin"
              className="text-blue-600 hover:text-blue-500"
            >
              Or try regular signin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
