/**
 * Secure Token Management Utility
 * 
 * Manages JWT tokens securely using httpOnly cookies via API routes.
 * Falls back to localStorage for backward compatibility during migration.
 */

// Feature flag for gradual migration
const USE_SECURE_COOKIES = true;

/**
 * Store tokens securely in httpOnly cookies
 */
export async function setSecureTokens(accessToken: string, refreshToken?: string): Promise<boolean> {
  if (!USE_SECURE_COOKIES) {
    // Fallback to localStorage
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    return true;
  }

  try {
    const response = await fetch('/api/auth/set-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Also store in localStorage for client-side decoding (user info only)
      // The actual auth uses httpOnly cookies
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    }
    
    return data.success;
  } catch (error) {
    console.error('Failed to set secure tokens:', error);
    // Fallback to localStorage
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    return true;
  }
}

/**
 * Get access token (prefers httpOnly cookie)
 */
export async function getSecureAccessToken(): Promise<string | null> {
  if (!USE_SECURE_COOKIES) {
    return localStorage.getItem('accessToken');
  }

  try {
    const response = await fetch('/api/auth/get-token');
    const data = await response.json();
    
    if (data.success && data.accessToken) {
      return data.accessToken;
    }
    
    // Fallback to localStorage
    return localStorage.getItem('accessToken');
  } catch (error) {
    // Fallback to localStorage
    return localStorage.getItem('accessToken');
  }
}

/**
 * Clear all tokens (both cookies and localStorage)
 */
export async function clearSecureTokens(): Promise<boolean> {
  // Always clear localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');

  if (!USE_SECURE_COOKIES) {
    return true;
  }

  try {
    const response = await fetch('/api/auth/clear-tokens', {
      method: 'POST',
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to clear secure tokens:', error);
    return true; // localStorage already cleared
  }
}

/**
 * Refresh tokens using httpOnly cookie
 */
export async function refreshSecureTokens(): Promise<boolean> {
  if (!USE_SECURE_COOKIES) {
    return false; // Let the existing api.ts interceptor handle it
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Failed to refresh secure tokens:', error);
    return false;
  }
}

/**
 * Check if user has valid tokens
 */
export async function hasValidTokens(): Promise<boolean> {
  const token = await getSecureAccessToken();
  if (!token) return false;
  
  try {
    // Decode and check expiry
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

/**
 * Validate token server-side (more secure)
 * Use this for critical operations
 */
export async function validateTokenServerSide(): Promise<{
  valid: boolean;
  user?: { id: string; email: string; firstName: string; lastName: string; role?: string };
}> {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'GET',
    });
    const data = await response.json();
    
    if (data.success && data.valid) {
      return { valid: true, user: data.user };
    }
    
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Full validation against auth service (most secure, use sparingly)
 */
export async function validateTokenFull(): Promise<{
  valid: boolean;
  user?: { id: string; email: string; firstName: string; lastName: string; role?: string };
}> {
  try {
    const response = await fetch('/api/auth/validate', {
      method: 'POST',
    });
    const data = await response.json();
    
    if (data.success && data.valid) {
      return { valid: true, user: data.user };
    }
    
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

/**
 * Get user info from token (for display purposes only)
 * Note: This is NOT for authentication - just UI display
 */
export function getUserFromToken(): { id: string; email: string; firstName: string; lastName: string; role?: string } | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId,
      email: payload.email,
      firstName: payload.firstName || payload.first_name || '',
      lastName: payload.lastName || payload.last_name || '',
      role: payload.userType || payload.role,
    };
  } catch {
    return null;
  }
}
