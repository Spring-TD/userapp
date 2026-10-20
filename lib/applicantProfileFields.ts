import type { RequirementSubmission } from '@/lib/storefrontApplicationClient'

export type PepAnswer = 'yes' | 'no' | ''
export type SpouseRepaymentAnswer = 'yes' | 'no' | ''

export type ApplicantProfileDraft = {
  loanReason: string
  loanReasonOther: string
  maritalStatus: string
  monthlyEarnings: string
  repaymentSource: string
  repaymentSourceOther: string
  politicallyExposed: PepAnswer
  repayingWithSpouse: SpouseRepaymentAnswer
}

export const LOAN_REASON_OPTIONS = [
  'rent',
  'hospital',
  'emergency',
  'business',
  'family expenses',
  'food stuff',
  'investment',
  'other',
] as const

export const REPAYMENT_SOURCE_OPTIONS = [
  'salary',
  'business',
  'contract earning',
  'stocks',
  'crowdfunding',
  'other',
] as const

export const MARITAL_STATUS_OPTIONS = [
  'single',
  'married',
  'divorced',
  'widowed',
  'separated',
] as const

export const DEFAULT_APPLICANT_PROFILE: ApplicantProfileDraft = {
  loanReason: '',
  loanReasonOther: '',
  maritalStatus: '',
  monthlyEarnings: '',
  repaymentSource: '',
  repaymentSourceOther: '',
  politicallyExposed: '',
  repayingWithSpouse: '',
}

function profileSubmission(
  requirementType: string,
  value: string | Record<string, unknown>,
): RequirementSubmission {
  return {
    requirementType,
    label: requirementType,
    type: 'json',
    value: typeof value === 'string' ? value : value,
  }
}

function readSubmissionValue(
  submissions: RequirementSubmission[],
  requirementType: string,
): unknown {
  const row = submissions.find(
    (s) => (s.requirementType || s.label || '').toLowerCase() === requirementType.toLowerCase(),
  )
  return row?.value
}

export function applicantProfileFromSubmissions(
  submissions: RequirementSubmission[],
): ApplicantProfileDraft {
  const loanReasonRaw = readSubmissionValue(submissions, 'Loan Reason')
  const repaymentRaw = readSubmissionValue(submissions, 'Source of Repayment')
  const pepRaw = readSubmissionValue(submissions, 'PEP Status')
  const spouseRaw = readSubmissionValue(submissions, 'Repaying with Spouse')

  let loanReason = ''
  let loanReasonOther = ''
  if (typeof loanReasonRaw === 'string') {
    if (LOAN_REASON_OPTIONS.includes(loanReasonRaw as (typeof LOAN_REASON_OPTIONS)[number])) {
      loanReason = loanReasonRaw
    } else if (loanReasonRaw) {
      loanReason = 'other'
      loanReasonOther = loanReasonRaw
    }
  } else if (loanReasonRaw && typeof loanReasonRaw === 'object') {
    const obj = loanReasonRaw as { value?: string; other?: string }
    loanReason = obj.value || ''
    loanReasonOther = obj.other || ''
  }

  let repaymentSource = ''
  let repaymentSourceOther = ''
  if (typeof repaymentRaw === 'string') {
    repaymentSource = repaymentRaw
  } else if (repaymentRaw && typeof repaymentRaw === 'object') {
    const obj = repaymentRaw as { value?: string; other?: string }
    repaymentSource = obj.value || ''
    repaymentSourceOther = obj.other || ''
  }

  const pep =
    pepRaw === 'yes' || pepRaw === 'no'
      ? pepRaw
      : pepRaw && typeof pepRaw === 'object' && 'value' in (pepRaw as object)
        ? String((pepRaw as { value?: string }).value || '')
        : ''
  const spouse =
    spouseRaw === 'yes' || spouseRaw === 'no'
      ? spouseRaw
      : spouseRaw && typeof spouseRaw === 'object' && 'value' in (spouseRaw as object)
        ? String((spouseRaw as { value?: string }).value || '')
        : ''

  return {
    loanReason,
    loanReasonOther,
    maritalStatus: String(readSubmissionValue(submissions, 'Marital Status') || ''),
    monthlyEarnings: String(readSubmissionValue(submissions, 'Monthly Earnings') || ''),
    repaymentSource,
    repaymentSourceOther,
    politicallyExposed: pep === 'yes' || pep === 'no' ? pep : '',
    repayingWithSpouse: spouse === 'yes' || spouse === 'no' ? spouse : '',
  }
}

export function applicantProfileSubmissions(profile: ApplicantProfileDraft): RequirementSubmission[] {
  const loanReasonValue =
    profile.loanReason === 'other'
      ? { value: 'other', other: profile.loanReasonOther.trim() }
      : profile.loanReason

  const repaymentValue =
    profile.repaymentSource === 'other'
      ? { value: 'other', other: profile.repaymentSourceOther.trim() }
      : profile.repaymentSource

  return [
    profileSubmission('Loan Reason', loanReasonValue),
    profileSubmission('Marital Status', profile.maritalStatus),
    profileSubmission('Monthly Earnings', profile.monthlyEarnings),
    profileSubmission('Source of Repayment', repaymentValue),
    profileSubmission('PEP Status', profile.politicallyExposed),
    profileSubmission('Repaying with Spouse', profile.repayingWithSpouse),
  ]
}

const PROFILE_REQUIREMENT_TYPES = new Set([
  'loan reason',
  'marital status',
  'monthly earnings',
  'source of repayment',
  'pep status',
  'repaying with spouse',
])

export function isApplicantProfileSubmission(submission: RequirementSubmission): boolean {
  const key = (submission.requirementType || submission.label || '').toLowerCase()
  return PROFILE_REQUIREMENT_TYPES.has(key)
}

export function mergeApplicantProfileSubmissions(
  profile: ApplicantProfileDraft,
  submissions: RequirementSubmission[],
): RequirementSubmission[] {
  const withoutProfile = submissions.filter((s) => !isApplicantProfileSubmission(s))
  return [...withoutProfile, ...applicantProfileSubmissions(profile)]
}

export function validateLoanApplicantProfile(
  profile: ApplicantProfileDraft,
  productLabel: 'loan' | 'mortgage' = 'loan',
): string | null {
  const product = productLabel === 'mortgage' ? 'mortgage' : 'loan'
  if (!profile.loanReason) return `Select the reason for this ${product}.`
  if (profile.loanReason === 'other' && !profile.loanReasonOther.trim()) {
    return `Enter the reason for this ${product}.`
  }
  if (!profile.maritalStatus) return 'Select your marital status.'
  if (!profile.monthlyEarnings.trim()) return 'Enter your monthly earnings.'
  if (!profile.repaymentSource) return 'Select your source of repayment.'
  if (profile.repaymentSource === 'other' && !profile.repaymentSourceOther.trim()) {
    return 'Enter your source of repayment.'
  }
  if (!profile.repayingWithSpouse) {
    return `Please indicate whether you are repaying this ${product} with a spouse.`
  }
  return null
}

export function validatePepAnswer(profile: ApplicantProfileDraft): string | null {
  if (!profile.politicallyExposed) {
    return 'Please indicate whether you are a politically exposed person.'
  }
  return null
}

/** @deprecated Use `validateLoanApplicantProfile` and `validatePepAnswer` separately. */
export function validateApplicantProfile(profile: ApplicantProfileDraft): string | null {
  return validateLoanApplicantProfile(profile) || validatePepAnswer(profile)
}

export function pepStatusSubmission(pep: 'yes' | 'no'): RequirementSubmission {
  return profileSubmission('PEP Status', pep)
}
