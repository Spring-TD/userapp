/** Client-side rules aligned with client-auth-ms documentation. */

export function validatePasswordForMobileUser(password: string): string | null {
  if (password.length < 8 || password.length > 128) {
    return 'Password must be between 8 and 128 characters.'
  }
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.'
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.'
  return null
}

export function validateNamePart(value: string, label: string): string | null {
  const t = value.trim()
  if (t.length < 2 || t.length > 50) return `${label} must be between 2 and 50 characters.`
  return null
}

/** ISO 3166-1 alpha-2 (Fuspay / client-auth expect uppercase codes like NG, KE). */
export function validateCountry(country: string): string | null {
  const t = country.trim()
  if (!t) return 'Please select a country.'
  if (!/^[A-Za-z]{2}$/.test(t)) return 'Country must be a two-letter code. Select a country from the list.'
  return null
}

export function validateInternationalPhone(phone: string): string | null {
  const t = phone.trim()
  if (!t.startsWith('+')) return 'Phone must be in international format (e.g. +2348012345678).'
  if (t.length < 8 || t.length > 20) return 'Phone number looks invalid.'
  if (!/^\+[0-9\s-]{6,19}$/.test(t)) return 'Phone must contain only digits after the country code.'
  return null
}
