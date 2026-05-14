export type FilePayload = {
  type: string
  fileName: string
  fileType: string
  fileSize: number
  fileData: string // base64
}

export type Address = {
  street: string
  city: string
  state?: string
  postalCode?: string
  country: string
}

export type IndividualKycRequest = {
  personalInfo: {
    firstName: string
    lastName: string
    dateOfBirth: string
    nationality: string
    address: Address
  }
  documents: FilePayload[]
}

export type BusinessKycRequest = {
  businessInfo: {
    businessName: string
    businessType: string
    registrationNumber: string
    industry?: string
    address: Address
  }
  beneficialOwners: Array<{
    fullName: string
    dateOfBirth: string
    nationality: string
    ownershipPercentage?: number
    address?: Address
  }>
  directors: Array<{
    fullName: string
    position?: string
    dateOfBirth?: string
    nationality?: string
  }>
  documents: FilePayload[]
}

export type KycStatusResponse = {
  success: boolean
  data?: any
  error?: string
}
