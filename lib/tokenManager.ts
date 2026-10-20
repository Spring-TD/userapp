/**
 * Token management: cookies are the primary store so tokens persist across reloads.
 * Access token is set as a readable cookie by /api/auth/set-tokens and /api/auth/refresh.
 */

import { getAccessToken } from './cookieAuth'

/**
 * Store tokens: set cookies via API (persists; no localStorage)
 */
export async function setSecureTokens(accessToken: string, refreshToken?: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/set-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accessToken, refreshToken }),
    })
    const data = await response.json()
    return !!data.success
  } catch (error) {
    console.error('Failed to set tokens:', error)
    return false
  }
}

/**
 * Get access token (sync): cookie first, then localStorage fallback
 */
export function getSecureAccessTokenSync(): string | null {
  return getAccessToken()
}

/**
 * Get access token (async): same as sync, for compatibility
 */
export async function getSecureAccessToken(): Promise<string | null> {
  return getAccessToken()
}

/**
 * Clear tokens: clear cookies via API and localStorage
 */
export async function clearSecureTokens(): Promise<boolean> {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  try {
    const response = await fetch('/api/auth/clear-tokens', {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    return !!data.success
  } catch (error) {
    console.error('Failed to clear tokens:', error)
    return true
  }
}

/**
 * Refresh tokens using refresh cookie (server reads it)
 */
export async function refreshSecureTokens(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    return !!data.success
  } catch (error) {
    console.error('Failed to refresh tokens:', error)
    return false
  }
}

/**
 * Check if user has valid tokens
 */
export async function hasValidTokens(): Promise<boolean> {
  const token = getAccessToken()
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiry = payload.exp * 1000
    return Date.now() < expiry
  } catch {
    return false
  }
}

/**
 * Validate token server-side (cookie is sent automatically)
 */
export async function validateTokenServerSide(): Promise<{
  valid: boolean
  user?: { id: string; email: string; firstName: string; lastName: string; role?: string }
}> {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'GET',
      credentials: 'include',
    })
    const data = await response.json()
    if (data.success && data.valid) {
      return { valid: true, user: data.user }
    }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/**
 * Full validation against auth service
 */
export async function validateTokenFull(): Promise<{
  valid: boolean
  user?: { id: string; email: string; firstName: string; lastName: string; role?: string }
}> {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
      credentials: 'include',
    })
    const data = await response.json()
    if (data.success && data.valid) {
      return { valid: true, user: data.user }
    }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

/**
 * Get user from token (cookie or localStorage) for display only
 */
export function getUserFromToken(): { id: string; email: string; firstName: string; lastName: string; role?: string } | null {
  const token = getAccessToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      id: payload.userId ?? payload.sub,
      email: payload.email ?? '',
      firstName: payload.firstName ?? payload.first_name ?? '',
      lastName: payload.lastName ?? payload.last_name ?? '',
      role: payload.userType ?? payload.role,
    }
  } catch {
    return null
  }
}
