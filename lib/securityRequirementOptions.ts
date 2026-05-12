/** Labels always merged into API “security requirements” options (loan + mortgage configure). */
export const EXTRA_SECURITY_REQUIREMENT_OPTIONS = ["Cheque", "Bank Guarantee", "Other"] as const

export const OTHER_SECURITY_CANONICAL_LABEL = "Other"

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
