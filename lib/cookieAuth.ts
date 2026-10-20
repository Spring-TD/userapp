/**
 * Cookie-based auth: single source for access token so it persists across reloads.
 * Tokens now live only in cookies set by /api/auth/set-tokens and refresh.
 */

const ACCESS_TOKEN_KEY = 'accessToken'

/**
 * Get access token from cookie.
 * Cookie is set by the server and persists; never use localStorage for tokens.
 */
export function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + ACCESS_TOKEN_KEY + '=([^;]*)'))
  const fromCookie = match ? decodeURIComponent(match[1]) : null
  if (fromCookie) return fromCookie
  return null
}

/**
 * Get refresh token.
 * Refresh tokens are now stored as httpOnly cookies only; the client
 * JavaScript layer never reads them. This helper is kept for API
 * compatibility but always returns null.
 */
export function getRefreshToken(): string | null {
  return null
}
