import { apiClient } from '@/lib/api'

export type PlatformFieldType = 'boolean' | 'number' | 'select' | 'text'

export type PlatformFieldDefinition = {
  key: string
  label: string
  type: PlatformFieldType
  required?: boolean
  productTypes?: string[]
  optionsPath?: string
  otherFieldKey?: string
  otherFieldLabel?: string
  triggersSpouseKyc?: boolean
}

export type PlatformSelectOption = {
  value: string
  label: string
}

/** Draft shape used in forms (strings for numeric inputs). */
export type PlatformFieldsDraft = {
  isPoliticallyExposedPerson?: boolean
  monthlyIncome: string
  repaymentSource: string
  repaymentSourceOther: string
  maritalStatus: string
  maritalStatusOther: string
  loanReason: string
  loanReasonOther: string
  repayingWithSpouse?: boolean
  spouseFullName: string
  spouseEmail: string
  spousePhone: string
  spouseOccupation: string
  spouseCountry: string
}

/** API payload shape for init / progress / submit. */
export type PlatformFields = {
  isPoliticallyExposedPerson?: boolean
  monthlyIncome?: number
  repaymentSource?: string
  repaymentSourceOther?: string
  maritalStatus?: string
  maritalStatusOther?: string
  loanReason?: string
  loanReasonOther?: string
  repayingWithSpouse?: boolean
  spouseFullName?: string
  spouseEmail?: string
  spousePhone?: string
  spouseOccupation?: string
  spouseCountry?: string
}

export const DEFAULT_PLATFORM_FIELDS_DRAFT: PlatformFieldsDraft = {
  monthlyIncome: '',
  repaymentSource: '',
  repaymentSourceOther: '',
  maritalStatus: '',
  maritalStatusOther: '',
  loanReason: '',
  loanReasonOther: '',
  spouseFullName: '',
  spouseEmail: '',
  spousePhone: '',
  spouseOccupation: '',
  spouseCountry: '',
}

/** Bind PEP + platform fields from GET application (submitted or draft progress). */
export function resolvePlatformFieldsFromApplication(
  application?: {
    platformFields?: PlatformFields | null
    applicationProgress?: { metadata?: { platformFields?: PlatformFields } } | null
  } | null,
): PlatformFields | undefined {
  if (!application) return undefined
  const topLevel = application.platformFields ?? undefined
  const fromProgress = application.applicationProgress?.metadata?.platformFields ?? undefined
  if (!topLevel && !fromProgress) return undefined
  return { ...(fromProgress ?? {}), ...(topLevel ?? {}) }
}

export function resolveIsPoliticallyExposedPerson(
  application?: {
    platformFields?: PlatformFields | null
    applicationProgress?: { metadata?: { platformFields?: PlatformFields } } | null
  } | null,
): boolean | undefined {
  const pep = resolvePlatformFieldsFromApplication(application)?.isPoliticallyExposedPerson
  if (typeof pep === 'boolean') return pep
  return undefined
}

const FALLBACK_FIELD_CATALOG: PlatformFieldDefinition[] = [
  {
    key: 'isPoliticallyExposedPerson',
    label: 'Are you a Politically Exposed Person?',
    type: 'boolean',
    required: true,
  },
  {
    key: 'monthlyIncome',
    label: 'How much do you earn monthly?',
    type: 'number',
    required: true,
  },
  {
    key: 'repaymentSource',
    label: 'Source of repayment',
    type: 'select',
    required: true,
    optionsPath: '/repayment-source',
    otherFieldKey: 'repaymentSourceOther',
    otherFieldLabel: 'Please specify your source of repayment',
  },
  {
    key: 'maritalStatus',
    label: 'Marital status',
    type: 'select',
    required: true,
    optionsPath: '/marital-status',
    otherFieldKey: 'maritalStatusOther',
    otherFieldLabel: 'Please specify your marital status',
  },
  {
    key: 'loanReason',
    label: 'Reason for the loan',
    type: 'select',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
    optionsPath: '/loan-reason',
    otherFieldKey: 'loanReasonOther',
    otherFieldLabel: 'Please specify your reason for the loan',
  },
  {
    key: 'repayingWithSpouse',
    label: 'Are you repaying this loan with a spouse?',
    type: 'boolean',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
    triggersSpouseKyc: true,
  },
  {
    key: 'spouseFullName',
    label: 'Spouse full name',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
  },
  {
    key: 'spouseEmail',
    label: 'Spouse email',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
  },
  {
    key: 'spousePhone',
    label: 'Spouse phone',
    type: 'text',
    required: true,
    productTypes: ['LOAN', 'MORTGAGE'],
  },
]

type ApiEnvelope<T> = {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

function parsePositiveNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(/[^\d.]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function filterFieldsForProductType(
  fields: PlatformFieldDefinition[],
  productType: string,
): PlatformFieldDefinition[] {
  const normalized = productType.toUpperCase()
  return fields.filter((field) => {
    if (!field.productTypes?.length) return true
    return field.productTypes.some((type) => type.toUpperCase() === normalized)
  })
}

export function shouldShowPlatformField(
  field: PlatformFieldDefinition,
  draft: PlatformFieldsDraft,
): boolean {
  if (field.key.startsWith('spouse') && field.key !== 'spouseOccupation' && field.key !== 'spouseCountry') {
    return draft.repayingWithSpouse === true
  }
  return true
}

export function platformFieldsFromDraft(draft: PlatformFieldsDraft): PlatformFields {
  const monthlyIncome = parsePositiveNumber(draft.monthlyIncome)
  const payload: PlatformFields = {}

  if (draft.isPoliticallyExposedPerson !== undefined) {
    payload.isPoliticallyExposedPerson = draft.isPoliticallyExposedPerson
  }
  if (monthlyIncome != null) payload.monthlyIncome = monthlyIncome
  if (draft.repaymentSource) payload.repaymentSource = draft.repaymentSource
  if (draft.repaymentSource === 'other' && draft.repaymentSourceOther.trim()) {
    payload.repaymentSourceOther = draft.repaymentSourceOther.trim()
  }
  if (draft.maritalStatus) payload.maritalStatus = draft.maritalStatus
  if (draft.maritalStatus === 'other' && draft.maritalStatusOther.trim()) {
    payload.maritalStatusOther = draft.maritalStatusOther.trim()
  }
  if (draft.loanReason) payload.loanReason = draft.loanReason
  if (draft.loanReason === 'other' && draft.loanReasonOther.trim()) {
    payload.loanReasonOther = draft.loanReasonOther.trim()
  }
  if (draft.repayingWithSpouse !== undefined) {
    payload.repayingWithSpouse = draft.repayingWithSpouse
  }
  if (draft.repayingWithSpouse === true) {
    if (draft.spouseFullName.trim()) payload.spouseFullName = draft.spouseFullName.trim()
    if (draft.spouseEmail.trim()) payload.spouseEmail = draft.spouseEmail.trim()
    if (draft.spousePhone.trim()) payload.spousePhone = draft.spousePhone.trim()
    if (draft.spouseOccupation.trim()) payload.spouseOccupation = draft.spouseOccupation.trim()
    if (draft.spouseCountry.trim()) payload.spouseCountry = draft.spouseCountry.trim()
  }

  return payload
}

export function platformFieldsDraftFromApi(fields?: PlatformFields | null): PlatformFieldsDraft {
  if (!fields) return { ...DEFAULT_PLATFORM_FIELDS_DRAFT }
  return {
    isPoliticallyExposedPerson: fields.isPoliticallyExposedPerson,
    monthlyIncome: fields.monthlyIncome != null ? String(fields.monthlyIncome) : '',
    repaymentSource: fields.repaymentSource || '',
    repaymentSourceOther: fields.repaymentSourceOther || '',
    maritalStatus: fields.maritalStatus || '',
    maritalStatusOther: fields.maritalStatusOther || '',
    loanReason: fields.loanReason || '',
    loanReasonOther: fields.loanReasonOther || '',
    repayingWithSpouse: fields.repayingWithSpouse,
    spouseFullName: fields.spouseFullName || '',
    spouseEmail: fields.spouseEmail || '',
    spousePhone: fields.spousePhone || '',
    spouseOccupation: fields.spouseOccupation || '',
    spouseCountry: fields.spouseCountry || '',
  }
}

export function mergePlatformFieldsDraft(
  ...sources: Array<PlatformFields | PlatformFieldsDraft | null | undefined>
): PlatformFieldsDraft {
  let merged = { ...DEFAULT_PLATFORM_FIELDS_DRAFT }
  for (const source of sources) {
    if (!source) continue
    merged = {
      ...merged,
      ...platformFieldsDraftFromApi(
        'monthlyIncome' in source && typeof source.monthlyIncome === 'string'
          ? platformFieldsFromDraft(source as PlatformFieldsDraft)
          : (source as PlatformFields),
      ),
    }
  }
  return merged
}

export function platformFieldsDraftFromLegacyApplicantProfile(profile: {
  loanReason?: string
  loanReasonOther?: string
  maritalStatus?: string
  monthlyEarnings?: string
  repaymentSource?: string
  repaymentSourceOther?: string
  politicallyExposed?: 'yes' | 'no' | ''
  repayingWithSpouse?: 'yes' | 'no' | ''
}): PlatformFieldsDraft {
  return {
    ...DEFAULT_PLATFORM_FIELDS_DRAFT,
    isPoliticallyExposedPerson:
      profile.politicallyExposed === 'yes'
        ? true
        : profile.politicallyExposed === 'no'
          ? false
          : undefined,
    monthlyIncome: profile.monthlyEarnings || '',
    repaymentSource: profile.repaymentSource || '',
    repaymentSourceOther: profile.repaymentSourceOther || '',
    maritalStatus: profile.maritalStatus || '',
    loanReason: profile.loanReason || '',
    loanReasonOther: profile.loanReasonOther || '',
    repayingWithSpouse:
      profile.repayingWithSpouse === 'yes'
        ? true
        : profile.repayingWithSpouse === 'no'
          ? false
          : undefined,
  }
}

export function validatePlatformFieldsDraft(
  draft: PlatformFieldsDraft,
  productType: 'LOAN' | 'MORTGAGE',
): string | null {
  if (draft.isPoliticallyExposedPerson === undefined) {
    return 'Please indicate whether you are a politically exposed person.'
  }
  if (!draft.monthlyIncome.trim()) {
    return 'Enter how much you earn monthly.'
  }
  const monthlyIncome = parsePositiveNumber(draft.monthlyIncome)
  if (monthlyIncome == null) {
    return 'Enter a valid monthly income.'
  }
  if (!draft.repaymentSource) {
    return 'Select your source of repayment.'
  }
  if (draft.repaymentSource === 'other' && !draft.repaymentSourceOther.trim()) {
    return 'Please specify your source of repayment.'
  }
  if (!draft.maritalStatus) {
    return 'Select your marital status.'
  }
  if (draft.maritalStatus === 'other' && !draft.maritalStatusOther.trim()) {
    return 'Please specify your marital status.'
  }
  if (productType === 'LOAN' || productType === 'MORTGAGE') {
    if (!draft.loanReason) {
      return `Select the reason for this ${productType === 'MORTGAGE' ? 'mortgage' : 'loan'}.`
    }
    if (draft.loanReason === 'other' && !draft.loanReasonOther.trim()) {
      return `Enter the reason for this ${productType === 'MORTGAGE' ? 'mortgage' : 'loan'}.`
    }
    if (draft.repayingWithSpouse === undefined) {
      return `Please indicate whether you are repaying this ${productType === 'MORTGAGE' ? 'mortgage' : 'loan'} with a spouse.`
    }
    if (draft.repayingWithSpouse === true) {
      if (!draft.spouseFullName.trim()) return 'Enter your spouse full name.'
      if (!draft.spouseEmail.trim()) return 'Enter your spouse email.'
      if (!draft.spousePhone.trim()) return 'Enter your spouse phone number.'
    }
  }
  return null
}

export async function fetchPlatformFieldCatalog(): Promise<PlatformFieldDefinition[]> {
  try {
    const res = await apiClient.get<ApiEnvelope<PlatformFieldDefinition[]>>(
      '/v1/products/options/platform-application-fields',
      { timeout: 20_000 },
    )
    const rows = Array.isArray(res.data?.data) ? res.data.data : []
    if (res.data?.success !== false && res.status < 400 && rows.length > 0) {
      return rows
    }
  } catch {
    /* fallback below */
  }
  return FALLBACK_FIELD_CATALOG
}

export async function fetchPlatformSelectOptions(optionsPath: string): Promise<PlatformSelectOption[]> {
  const slug = optionsPath.replace(/^\//, '')
  if (!slug) return []
  try {
    const res = await apiClient.get<ApiEnvelope<PlatformSelectOption[]>>(
      `/v1/products/options/${encodeURIComponent(slug)}`,
      { timeout: 20_000 },
    )
    const rows = Array.isArray(res.data?.data) ? res.data.data : []
    if (res.data?.success !== false && res.status < 400) {
      return rows.filter((row) => row?.value)
    }
  } catch {
    /* empty */
  }
  return []
}

export async function loadPlatformSelectOptionsMap(
  fields: PlatformFieldDefinition[],
): Promise<Record<string, PlatformSelectOption[]>> {
  const paths = [
    ...new Set(
      fields
        .filter((field) => field.type === 'select' && field.optionsPath)
        .map((field) => field.optionsPath as string),
    ),
  ]
  const entries = await Promise.all(
    paths.map(async (path) => [path, await fetchPlatformSelectOptions(path)] as const),
  )
  return Object.fromEntries(entries)
}
