/** GET /api/v1/kyc/modular/verification-url — compliance modular KYC */
export interface KycModularVerificationUrlData {
  customerId?: string
  verificationId?: string
  verificationUrl?: string
  reference?: string
  status?: string
  overallStatus?: string
  completedChecks?: number
  totalChecks?: number
  lastSyncedAt?: string
}

export interface KycModularVerificationUrlResponse {
  success: boolean
  data?: KycModularVerificationUrlData
  error?: string
  message?: string
}

/** POST /api/v1/kyc/modular/verification — 201 from Fuspay; URL may be top-level or nested */
export interface KycModularVerificationCreateResponse {
  success?: boolean
  verification_url?: string
  verificationUrl?: string
  data?: KycModularVerificationUrlData & {
    verification_url?: string
    verificationUrl?: string
  }
  error?: string
  message?: string
}
