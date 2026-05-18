import type { RegisterUserResponse } from "@/types/mobileClientAuth"

/** True when registration response indicates a linked Fuspay customer. */
export function isFuspayCustomerLinked(data: RegisterUserResponse | null | undefined): boolean {
  if (!data) return false
  if (data.fuspayProfileCreated === true) return true
  const id = data.fuspayUserId?.trim() || data.fuspayUserRef?.trim()
  return Boolean(id)
}

/** When the gateway explicitly reports Fuspay failure. */
export function isFuspayRegistrationFailed(data: RegisterUserResponse | null | undefined): boolean {
  if (!data) return false
  if (data.fuspayProfileCreated === false) return true
  if (data.fuspayProfileCreated === true) return false
  return false
}

export function fuspayRegistrationErrorMessage(): string {
  return (
    "Your account was created, but Fuspay identity setup did not complete. " +
    "Sign in from your store link (e.g. crbc.tryspring.io) and try again, or contact support."
  )
}
