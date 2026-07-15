import {
  parseApplicationAmount,
  validateApplicationAmount,
} from '@/lib/applicationAmount'
import {
  validatePlatformFieldsDraft,
  type PlatformFieldsDraft,
} from '@/lib/platformApplicationFields'
import type { RequirementSubmission } from '@/lib/storefrontApplicationClient'

export type EmploymentDraft = {
  occupation: string
  placeOfWork: string
  hrName: string
  hrEmail: string
}

export type CollateralRequirement = {
  requirementId?: string
  id?: string
  requirementType?: string
  label?: string
  contentType?: string
  uploadRequired?: boolean
  required?: boolean
}

export function collateralRequirementKey(requirement: CollateralRequirement): string {
  return String(
    requirement.requirementId ||
      requirement.id ||
      requirement.requirementType ||
      requirement.label ||
      '',
  )
}

export function collateralNeedsUpload(requirement: CollateralRequirement): boolean {
  const contentType = String(requirement.contentType || '').toLowerCase()
  return Boolean(
    requirement.uploadRequired ||
      requirement.required ||
      contentType.includes('document'),
  )
}

export function validateEmploymentDraft(employment: EmploymentDraft): string | null {
  if (!employment.occupation.trim()) return 'Enter your occupation.'
  if (!employment.placeOfWork.trim()) return 'Enter your place of work.'
  if (!employment.hrName.trim()) return "Enter your HR contact's name."
  if (!employment.hrEmail.trim()) return "Enter your HR contact's email."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employment.hrEmail.trim())) {
    return 'Enter a valid HR email address.'
  }
  return null
}

export function validateCollateralRequirements(
  requirements: CollateralRequirement[],
  submissions: RequirementSubmission[],
): string | null {
  for (const requirement of requirements) {
    if (!collateralNeedsUpload(requirement)) continue
    const key = collateralRequirementKey(requirement)
    const submission = submissions.find(
      (item) => (item.requirementId || item.requirementType || item.label) === key,
    )
    const done = Boolean(submission?.fileUrl || submission?.value)
    if (!done) {
      const label = requirement.label || requirement.requirementType || 'collateral document'
      return `Upload the required collateral document: ${label}.`
    }
  }
  return null
}

export function validateFileUploadStep(
  documents: Array<{ name?: string }>,
  submissions: RequirementSubmission[],
): string | null {
  for (const [index, document] of documents.entries()) {
    const documentName = document.name || `Document ${index + 1}`
    const submission = submissions.find((item) => (item.requirementType || item.label) === documentName)
    if (!submission?.fileUrl) {
      return `Upload the required form: ${documentName}.`
    }
  }
  return null
}

export function collectRequirementStepIssues(input: {
  applicationAmount: string
  amountMin?: number | null
  amountMax?: number | null
  platformFields: PlatformFieldsDraft
  employment: EmploymentDraft
  otherRequirements: CollateralRequirement[]
  requirementSubmissions: RequirementSubmission[]
  requiresGuarantor: boolean
  guarantorsCount: number
  spouseRequired: boolean
  spouseVerified: boolean
  productKind?: 'loan' | 'mortgage'
}): string[] {
  const issues: string[] = []

  const parsed = parseApplicationAmount(input.applicationAmount)
  if (!parsed) {
    issues.push('Enter the amount you want to apply for.')
  } else {
    const amountError = validateApplicationAmount(parsed, input.amountMin, input.amountMax)
    if (amountError) issues.push(amountError)
  }

  const platformFieldsError = validatePlatformFieldsDraft(
    input.platformFields,
    input.productKind === 'mortgage' ? 'MORTGAGE' : 'LOAN',
  )
  if (platformFieldsError) issues.push(platformFieldsError)

  const employmentError = validateEmploymentDraft(input.employment)
  if (employmentError) issues.push(employmentError)

  const collateralError = validateCollateralRequirements(
    input.otherRequirements,
    input.requirementSubmissions,
  )
  if (collateralError) issues.push(collateralError)

  if (input.requiresGuarantor && input.guarantorsCount === 0) {
    issues.push('Add at least one guarantor before continuing.')
  }

  if (input.spouseRequired && !input.spouseVerified) {
    issues.push('Complete spouse KYC before continuing.')
  }

  return issues
}
