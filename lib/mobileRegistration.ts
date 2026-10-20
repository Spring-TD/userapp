import type { MobileUserRegistrationDto } from "@/types/mobileClientAuth"
import type { RegisterUserResponse } from "@/types/mobileClientAuth"

/** Build POST /api/v1/registration/user body per gateway docs (Option A + optional app_id). */
export function buildMobileRegisterPayload(input: {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  password: string
  tenantSubdomain?: string | null
  merchantId?: string | null
  appId?: string | null
}): MobileUserRegistrationDto {
  const payload: MobileUserRegistrationDto = {
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    country: input.country.trim(),
    password: input.password,
  }

  if (input.tenantSubdomain) {
    payload.subdomain = input.tenantSubdomain.trim().toLowerCase()
  } else if (input.merchantId) {
    payload.user_merchant_id = input.merchantId.trim()
  }

  if (input.appId?.trim()) {
    payload.app_id = input.appId.trim()
  }

  return payload
}

export function parseRegisterUserResponse(data: unknown): RegisterUserResponse {
  const root = data != null && typeof data === "object" ? (data as RegisterUserResponse) : {}
  return root
}

/** Gateway sends OTP on signup when `verificationEmailSent` is true (default). */
export function registrationVerificationEmailSent(data: unknown): boolean {
  const r = parseRegisterUserResponse(data)
  if (r.verificationEmailSent === true) return true
  if (r.verificationEmailSent === false) return false
  return true
}

export function isOtpVerifyValid(data: unknown): boolean {
  const r = data != null && typeof data === "object" ? (data as Record<string, unknown>) : null
  if (!r) return false
  if (r.valid === false) return false
  if (r.success === false) return false
  if (r.valid === true || r.success === true) return true
  return false
}
