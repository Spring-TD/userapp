import type { MobileAppConfig } from "@/hooks/useMobileConfig"

/** Subset of W3C Web App Manifest used for storefront chrome + signup copy. */
export interface WebAppManifestBranding {
  name?: string
  short_name?: string
  description?: string
  theme_color?: string
  background_color?: string
  icons?: { src?: string; sizes?: string; type?: string; purpose?: string }[]
  policyTerms?: {
    privacyPolicy?: ManifestDocument
    termsOfService?: ManifestDocument
    faq?: ManifestFaqItem[]
  }
  support?: ManifestSupport
}

export interface ManifestDocument {
  title?: string
  contentHtml?: string
  contentText?: string
}

export interface ManifestFaqItem {
  id: string
  questionHtml?: string
  answerHtml?: string
}

export interface ManifestSupport {
  contactEmail?: string
  contactPhone?: string
  whatsapp?: string
  whatsappNumber?: string
  website?: string
  linkedinPage?: string
  privacyPolicyLink?: string
  termsAndConditionsLink?: string
  instagramHandle?: string
  twitterHandle?: string
}

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t || undefined
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function parseDocument(raw: unknown): ManifestDocument | undefined {
  const row = asRecord(raw)
  if (!row) return undefined
  const title = asTrimmedString(row.title)
  const contentHtml = asTrimmedString(row.contentHtml)
  const contentText = asTrimmedString(row.contentText)
  if (!title && !contentHtml && !contentText) return undefined
  return {
    ...(title ? { title } : {}),
    ...(contentHtml ? { contentHtml } : {}),
    ...(contentText ? { contentText } : {}),
  }
}

function parseFaq(raw: unknown): ManifestFaqItem[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const items = raw
    .map((item, index) => {
      const row = asRecord(item)
      if (!row) return null
      const questionHtml = asTrimmedString(row.questionHtml) || asTrimmedString(row.question)
      const answerHtml = asTrimmedString(row.answerHtml) || asTrimmedString(row.answer)
      if (!questionHtml && !answerHtml) return null
      return {
        id: asTrimmedString(row.id) || `faq-${index}`,
        ...(questionHtml ? { questionHtml } : {}),
        ...(answerHtml ? { answerHtml } : {}),
      }
    })
    .filter(Boolean) as ManifestFaqItem[]
  return items.length ? items : undefined
}

function parseSupport(raw: unknown): ManifestSupport | undefined {
  const row = asRecord(raw)
  if (!row) return undefined
  const support: ManifestSupport = {
    ...(asTrimmedString(row.contactEmail) ? { contactEmail: asTrimmedString(row.contactEmail) } : {}),
    ...(asTrimmedString(row.contactPhone) ? { contactPhone: asTrimmedString(row.contactPhone) } : {}),
    ...(asTrimmedString(row.whatsapp) ? { whatsapp: asTrimmedString(row.whatsapp) } : {}),
    ...(asTrimmedString(row.whatsappNumber) ? { whatsappNumber: asTrimmedString(row.whatsappNumber) } : {}),
    ...(asTrimmedString(row.website) ? { website: asTrimmedString(row.website) } : {}),
    ...(asTrimmedString(row.linkedinPage) ? { linkedinPage: asTrimmedString(row.linkedinPage) } : {}),
    ...(asTrimmedString(row.privacyPolicyLink) ? { privacyPolicyLink: asTrimmedString(row.privacyPolicyLink) } : {}),
    ...(asTrimmedString(row.termsAndConditionsLink) ? { termsAndConditionsLink: asTrimmedString(row.termsAndConditionsLink) } : {}),
    ...(asTrimmedString(row.instagramHandle) ? { instagramHandle: asTrimmedString(row.instagramHandle) } : {}),
    ...(asTrimmedString(row.twitterHandle) ? { twitterHandle: asTrimmedString(row.twitterHandle) } : {}),
  }
  return Object.keys(support).length ? support : undefined
}

export function parseWebAppManifestBranding(raw: unknown): WebAppManifestBranding | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const iconsRaw = o.icons
  const icons = Array.isArray(iconsRaw)
    ? iconsRaw
        .filter((i) => i && typeof i === "object")
        .map((i) => {
          const x = i as Record<string, unknown>
          return {
            src: asTrimmedString(x.src),
            sizes: asTrimmedString(x.sizes),
            type: asTrimmedString(x.type),
            purpose: asTrimmedString(x.purpose),
          }
        })
        .filter((i) => i.src)
    : undefined

  const name = asTrimmedString(o.name)
  const short_name = asTrimmedString(o.short_name)
  const description = asTrimmedString(o.description)
  const theme_color = asTrimmedString(o.theme_color)
  const background_color = asTrimmedString(o.background_color)
  const config = asRecord(o.config)
  const policyTermsRaw = asRecord(o.policyTerms) || asRecord(config?.policyTerms)
  const privacyPolicy = parseDocument(policyTermsRaw?.privacyPolicy)
  const termsOfService = parseDocument(policyTermsRaw?.termsOfService)
  const faq = parseFaq(policyTermsRaw?.faq)
  const support = parseSupport(o.support) || parseSupport(config?.support)
  const policyTerms =
    privacyPolicy || termsOfService || faq
      ? {
          ...(privacyPolicy ? { privacyPolicy } : {}),
          ...(termsOfService ? { termsOfService } : {}),
          ...(faq ? { faq } : {}),
        }
      : undefined

  if (
    !name &&
    !short_name &&
    !description &&
    !theme_color &&
    !background_color &&
    (!icons || icons.length === 0) &&
    !policyTerms &&
    !support
  ) {
    return null
  }

  return {
    ...(name ? { name } : {}),
    ...(short_name ? { short_name } : {}),
    ...(description ? { description } : {}),
    ...(theme_color ? { theme_color } : {}),
    ...(background_color ? { background_color } : {}),
    ...(icons && icons.length ? { icons } : {}),
    ...(policyTerms ? { policyTerms } : {}),
    ...(support ? { support } : {}),
  }
}

export function manifestDescription(m: WebAppManifestBranding | null): string | undefined {
  return m?.description?.trim() || undefined
}

export function storefrontDisplayName(m: WebAppManifestBranding | null): string | null {
  if (!m) return null
  return m.short_name?.trim() || m.name?.trim() || null
}

/** Prefer largest manifest icon for splash / chrome. */
export function pickManifestIconUrl(manifest: WebAppManifestBranding | null): string | undefined {
  const icons = manifest?.icons
  if (!icons?.length) return undefined
  const sorted = [...icons].sort((a, b) => {
    const sizeA = parseInt(String(a.sizes ?? "").split("x")[0] || "0", 10)
    const sizeB = parseInt(String(b.sizes ?? "").split("x")[0] || "0", 10)
    return sizeB - sizeA
  })
  return sorted.find((i) => i.src)?.src
}

export function manifestHasBrandColors(manifest: WebAppManifestBranding | null): boolean {
  return Boolean(manifest?.theme_color?.trim() || manifest?.background_color?.trim())
}

/** Apply manifest JSON (theme_color, background_color, names, icons) onto the default mobile shell config. */
export function applyManifestToMobileAppConfig(
  base: MobileAppConfig,
  manifest: WebAppManifestBranding | null,
  displayNameOverride: string | null,
): MobileAppConfig {
  const name = displayNameOverride?.trim() || storefrontDisplayName(manifest) || base.appName
  const themed = manifestHasBrandColors(manifest)
  const primary = themed && manifest?.theme_color?.trim() ? manifest.theme_color.trim() : base.theme.primaryColor
  const shell =
    themed && manifest?.background_color?.trim()
      ? manifest.background_color.trim()
      : themed && manifest?.theme_color?.trim()
        ? manifest.theme_color.trim()
        : base.onboarding.backgroundColor
  const logo = pickManifestIconUrl(manifest) || base.splash.logo

  return {
    ...base,
    appName: name,
    splash: {
      ...base.splash,
      logo,
      backgroundColor: themed ? shell : base.splash.backgroundColor,
    },
    onboarding: {
      ...base.onboarding,
      backgroundColor: themed ? shell : base.onboarding.backgroundColor,
      secondaryBackgroundColor: themed ? primary : base.onboarding.secondaryBackgroundColor,
      buttonColor: themed ? primary : base.onboarding.buttonColor,
    },
    theme: {
      ...base.theme,
      primaryColor: themed ? primary : base.theme.primaryColor,
      secondaryColor: themed ? primary : base.theme.secondaryColor,
    },
  }
}
