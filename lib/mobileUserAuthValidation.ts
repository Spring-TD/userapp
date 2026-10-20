/** Client-side rules aligned with client-auth-ms documentation. */

export function validatePasswordForMobileUser(password: string): string | null {
  if (password.length < 8 || password.length > 128) {
    return "Password must be between 8 and 128 characters."
  }
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter."
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter."
  if (!/[0-9]/.test(password)) return "Password must include at least one number."
  if (!/[@$!%*?&]/.test(password)) {
    return "Password must include at least one special character (@ $ ! % * ? &)."
  }
  return null
}

export function validateNamePart(value: string, label: string): string | null {
  const t = value.trim()
  if (t.length < 2 || t.length > 50) return `${label} must be between 2 and 50 characters.`
  return null
}

/** ISO 3166-1 alpha-2 (client-auth expects uppercase codes like NG, KE). */
export function validateCountry(country: string): string | null {
  const t = country.trim()
  if (!t) return "Please select a country."
  if (!/^[A-Za-z]{2}$/.test(t)) return "Country must be a two-letter code. Select a country from the list."
  return null
}

export function validateInternationalPhone(phone: string): string | null {
  const t = phone.trim().replace(/\s/g, "")
  if (!/^\+?[1-9]\d{1,14}$/.test(t)) {
    return "Phone must be E.164 format (e.g. +2348012345678)."
  }
  return null
}

/** E.164-style phone for registration body (matches Spring/Plata merchant signup). */
export function normalizeRegistrationPhone(phone: string, countryCode: string): string {
  const raw = phone.trim().replace(/\s/g, "").replace(/^\+/, "")
  const cc = countryCode.trim().toLowerCase()
  if (cc === "ng") {
    const digits = raw.replace(/^0/, "")
    if (digits.length <= 10) return `+234${digits}`
    return raw.startsWith("234") ? `+${raw}` : `+234${digits}`
  }
  return phone.trim().startsWith("+") ? phone.trim().replace(/\s/g, "") : `+${raw}`
}
