// hooks/useAuth.ts
import { authService } from "app/services/authServices"
import { useEffect, useState } from "react"

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authService.getCurrentUser()
        setUser(data)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password })
    const userData = await authService.getCurrentUser()
    setUser(userData)
    return data
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  return { user, loading, login, logout }
}
