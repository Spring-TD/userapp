/**
 * Maps axios / fetch errors from client-auth-ms (and our Next proxy) into user-facing strings.
 */
export function normalizeClientAuthError(error: unknown): string {
  const err = error as {
    response?: { data?: Record<string, unknown>; status?: number }
    message?: string
  }
  const data = err.response?.data
  const status = err.response?.status

  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (status === 503 || status === 502) {
    return 'Service is temporarily unavailable. Please try again shortly.'
  }
  if (status === 404) {
    return 'This action is not available right now. Please try again later.'
  }

  if (data?.message != null) {
    const m = data.message
    if (Array.isArray(m)) return m.map(String).join(', ')
    return String(m)
  }

  if (Array.isArray(data?.errors)) {
    return (data!.errors as { msg?: string; message?: string }[])
      .map((e) => e.msg || e.message || JSON.stringify(e))
      .join(', ')
  }

  if (typeof data?.error === 'string') return data.error
  if (data?.error && typeof data.error === 'object') {
    try {
      return JSON.stringify(data.error)
    } catch {
      return 'Request failed'
    }
  }

  if (!err.response) {
    return err.message || 'Network error. Check your connection and try again.'
  }

  return 'Something went wrong. Please try again.'
}
