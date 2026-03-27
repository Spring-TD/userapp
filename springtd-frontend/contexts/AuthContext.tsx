"use client"

import { createContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { setSecureTokens, clearSecureTokens, getUserFromToken } from "@/lib/tokenManager"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signin: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Get user info from token (for UI display only)
      const userData = getUserFromToken()
      if (userData) {
        setUser(userData)
      }
    } catch (error: any) {
      // Clear tokens on error
      await clearSecureTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signin = async (email: string, password: string) => {
    try {
      const response = await api.post("/auth/login", { email, password })

      // Backend returns: { success: true, data: { user, tokens: { accessToken, refreshToken } } }
      const responseData = response.data

      // Handle different response structures
      let userData, accessToken, refreshToken

      if (responseData?.data?.tokens) {
        // Standard structure: { success, data: { user, tokens: { accessToken, refreshToken } } }
        userData = responseData.data.user
        accessToken = responseData.data.tokens.accessToken
        refreshToken = responseData.data.tokens.refreshToken
      } else if (responseData?.data?.accessToken) {
        // Alternative: { success, data: { user, accessToken, refreshToken } }
        userData = responseData.data.user
        accessToken = responseData.data.accessToken
        refreshToken = responseData.data.refreshToken
      } else if (responseData?.accessToken) {
        // Direct: { user, accessToken, refreshToken }
        userData = responseData.user
        accessToken = responseData.accessToken
        refreshToken = responseData.refreshToken
      } else {
        throw new Error("Invalid response from server")
      }

      if (!accessToken) {
        throw new Error("No access token received from server")
      }

      // Store tokens securely in httpOnly cookies
      await setSecureTokens(accessToken, refreshToken)
      setUser(userData)
    } catch (error: any) {
      throw error
    }
  }

  const logout = async () => {
    await clearSecureTokens()
    setUser(null)
    router.push("/signin")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signin,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
