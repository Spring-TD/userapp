/** Labels always merged into API “security requirements” options (loan + mortgage configure). */
export const EXTRA_SECURITY_REQUIREMENT_OPTIONS = ["Cheque", "Bank Guarantee", "Other"] as const

export const OTHER_SECURITY_CANONICAL_LABEL = "Other"

export type SecurityCollateralRequirement = {
  requirementId?: string
  id?: string
  requirementType?: string
  label?: string
  contentType?: string
  description?: string
  templateFileUrl?: string
  templateFileName?: string
  fileUrl?: string
  fileName?: string
  uploadRequired?: boolean
  required?: boolean
}

function truthySecurityFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1"
}

const SECURITY_COLLATERAL_FLAGS: Array<{ flag: string; label: string }> = [
  { flag: "realEstateProperties", label: "Collateral" },
  { flag: "acceptCheque", label: "Cheque" },
  { flag: "bankGuarantee", label: "Bank Guarantee" },
  { flag: "savingsAccount", label: "Savings Account" },
  { flag: "otherProperties", label: "Other" },
]

/** Build apply-flow collateral rows from Product MS `requirements.security` booleans. */
export function collateralRequirementsFromSecurity(
  security: Record<string, unknown> | undefined | null,
  options?: {
    otherSpecification?: string
    securitySelection?: Record<string, unknown> | null
  },
): SecurityCollateralRequirement[] {
  const sec = security && typeof security === "object" ? security : {}
  const items: SecurityCollateralRequirement[] = []

  for (const row of SECURITY_COLLATERAL_FLAGS) {
    if (!truthySecurityFlag(sec[row.flag])) continue
    items.push({
      requirementId: `security:${row.flag}`,
      requirementType: row.label,
      label: row.label,
      contentType: "acknowledgement",
      description:
        row.flag === "otherProperties" ? options?.otherSpecification?.trim() || undefined : undefined,
    })
  }

  const selection = options?.securitySelection
  if (
    !items.some((item) => item.requirementType === "Collateral") &&
    selection &&
    truthySecurityFlag(selection.collateral)
  ) {
    items.unshift({
      requirementId: "security:collateral",
      requirementType: "Collateral",
      label: "Collateral",
      contentType: "acknowledgement",
    })
  }

  return items
}

/** Security booleans first; custom `otherRequirements` rows fill in uploads without duplicating labels. */
export function mergeCollateralRequirements(
  security: Record<string, unknown> | undefined | null,
  otherRequirements: SecurityCollateralRequirement[] | undefined | null,
  options?: {
    otherSpecification?: string
    securitySelection?: Record<string, unknown> | null
  },
): SecurityCollateralRequirement[] {
  const fromSecurity = collateralRequirementsFromSecurity(security, options)
  const others = Array.isArray(otherRequirements) ? otherRequirements : []
  const securityLabels = new Set(
    fromSecurity.map((row) => (row.label || row.requirementType || "").trim().toLowerCase()).filter(Boolean),
  )
  const dedupedOthers = others.filter((row) => {
    const key = (row.label || row.requirementType || "").trim().toLowerCase()
    return key ? !securityLabels.has(key) : true
  })
  return [...fromSecurity, ...dedupedOthers]
}

export function mergeSecurityRequirementDisplayOptions(apiLabels: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (label: string) => {
    const trimmed = String(label ?? "").trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }
  for (const o of apiLabels ?? []) add(o)
  for (const extra of EXTRA_SECURITY_REQUIREMENT_OPTIONS) {
    if (!seen.has(extra.toLowerCase())) {
      seen.add(extra.toLowerCase())
      out.push(extra)
    }
  }
  return out
}

export function isOtherSecuritySelected(selected: string[]): boolean {
  return selected.some((s) => s.trim().toLowerCase() === OTHER_SECURITY_CANONICAL_LABEL.toLowerCase())
}

/** Split API / stored strings into toggle state + free-text for “Other”. */
export function splitStoredSecurityRequirements(raw: string[]): { toggles: string[]; otherSpecification: string } {
  const toggles: string[] = []
  let otherSpecification = ""
  const pushOther = () => {
    if (!toggles.some((t) => t.trim().toLowerCase() === OTHER_SECURITY_CANONICAL_LABEL.toLowerCase())) {
      toggles.push(OTHER_SECURITY_CANONICAL_LABEL)
    }
  }
  for (const rawItem of raw) {
    const item = String(rawItem ?? "").trim()
    if (!item) continue
    if (/^other$/i.test(item)) {
      pushOther()
      continue
    }
    const m = item.match(/^other\s*[:：]\s*(.+)$/i)
    if (m) {
      pushOther()
      otherSpecification = m[1].trim()
      continue
    }
    toggles.push(item)
  }
  return { toggles, otherSpecification }
}

/** Payload strings for API: “Other” + detail becomes `Other: …`. */
export function serializeSecurityRequirements(selected: string[], otherSpecification: string): string[] {
  const detail = otherSpecification.trim()
  return selected.map((s) => {
    if (s.trim().toLowerCase() === OTHER_SECURITY_CANONICAL_LABEL.toLowerCase()) {
      return detail ? `${OTHER_SECURITY_CANONICAL_LABEL}: ${detail}` : OTHER_SECURITY_CANONICAL_LABEL
    }
    return s
  })
}
