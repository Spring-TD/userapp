import type { MobileAppConfig } from "@/hooks/useMobileConfig"

/** Subset of W3C Web App Manifest used for storefront chrome + signup copy. */
export interface WebAppManifestBranding {
  name?: string
  short_name?: string
  description?: string
  theme_color?: string
  background_color?: string
  icons?: { src?: string; sizes?: string; type?: string; purpose?: string }[]
  /** From app_builder.config.splash / asset — in-app splash (not only PWA chrome). */
  splashPrimaryColor?: string
  splashSecondaryColor?: string
  splashImageUrl?: string
  logoUrl?: string
  onboardingScreens?: { title?: string; description?: string; image?: string }[]
  elementPrimaryColor?: string
  elementSecondaryColor?: string
  profileBgPrimary?: string
  profileBgSecondary?: string
  fontFamily?: string
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

  const appBuilder = asRecord(o.app_builder) || asRecord(o.appBuilder)
  const builderApp = asRecord(appBuilder?.app)
  const builderConfig = asRecord(appBuilder?.config) || asRecord(o.config)
  const asset = asRecord(builderConfig?.asset)
  const splashCfg = asRecord(builderConfig?.splash)
  const onboardingDoc = asRecord(builderConfig?.onboarding)
  const appProfile = asRecord(builderConfig?.appProfile)
  const textColors = asRecord(appProfile?.textColors)
  const elementColors = asRecord(appProfile?.elementColors)
  const backgroundColors = asRecord(appProfile?.backgroundColors)

  const screensRaw = Array.isArray(onboardingDoc?.screens) ? onboardingDoc!.screens : []
  const onboardingScreens = screensRaw
    .map((row) => {
      const s = asRecord(row)
      if (!s) return null
      const title = asTrimmedString(s.title)
      const description = asTrimmedString(s.description) || asTrimmedString(s.subtitle)
      const image = asTrimmedString(s.screenImageUrl) || asTrimmedString(s.image)
      if (!title && !description && !image) return null
      return { ...(title ? { title } : {}), ...(description ? { description } : {}), ...(image ? { image } : {}) }
    })
    .filter(Boolean) as { title?: string; description?: string; image?: string }[]

  const name =
    asTrimmedString(o.name) || asTrimmedString(builderApp?.name) || asTrimmedString(builderApp?.alias)
  const short_name =
    asTrimmedString(o.short_name) || asTrimmedString(builderApp?.alias) || asTrimmedString(builderApp?.name)
  const description =
    asTrimmedString(o.description) || asTrimmedString(asset?.siteDescription)
  const theme_color =
    asTrimmedString(o.theme_color) ||
    asTrimmedString(splashCfg?.primaryColor) ||
    asTrimmedString(elementColors?.primary)
  const background_color =
    asTrimmedString(o.background_color) ||
    asTrimmedString(splashCfg?.secondaryColor) ||
    asTrimmedString(backgroundColors?.primary)
  const splashPrimaryColor = asTrimmedString(splashCfg?.primaryColor) || theme_color
  const splashSecondaryColor = asTrimmedString(splashCfg?.secondaryColor) || background_color
  const splashImageUrl = asTrimmedString(asset?.splashImageUrl)
  const logoUrl = asTrimmedString(asset?.logoUrl)
  const elementPrimaryColor = asTrimmedString(elementColors?.primary)
  const elementSecondaryColor = asTrimmedString(elementColors?.secondary)
  const profileBgPrimary = asTrimmedString(backgroundColors?.primary)
  const profileBgSecondary = asTrimmedString(backgroundColors?.secondary)
  const fontFamily = asTrimmedString(appProfile?.fontFamily)

  const config = builderConfig
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
    !splashImageUrl &&
    !logoUrl &&
    !onboardingScreens.length &&
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
    ...(splashPrimaryColor ? { splashPrimaryColor } : {}),
    ...(splashSecondaryColor ? { splashSecondaryColor } : {}),
    ...(splashImageUrl ? { splashImageUrl } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(onboardingScreens.length ? { onboardingScreens } : {}),
    ...(elementPrimaryColor ? { elementPrimaryColor } : {}),
    ...(elementSecondaryColor ? { elementSecondaryColor } : {}),
    ...(profileBgPrimary ? { profileBgPrimary } : {}),
    ...(profileBgSecondary ? { profileBgSecondary } : {}),
    ...(fontFamily ? { fontFamily } : {}),
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

/** Prefer logoUrl from app builder, else largest manifest icon. */
export function pickManifestIconUrl(manifest: WebAppManifestBranding | null): string | undefined {
  const fromAsset = manifest?.logoUrl?.trim()
  if (fromAsset) return fromAsset
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
  return Boolean(
    manifest?.theme_color?.trim() ||
      manifest?.background_color?.trim() ||
      manifest?.splashPrimaryColor?.trim() ||
      manifest?.elementPrimaryColor?.trim(),
  )
}

/** Neutral shell — no dummy Airpay/mortgage copy. Manifest fills name, colors, logo, steps. */
export function emptyMobileShellConfig(appId: string | null = null): MobileAppConfig {
  return {
    appId,
    appName: "",
    splash: {
      logo: undefined,
      image: undefined,
      backgroundColor: "#2563EB",
      textColor: "#FFFFFF",
    },
    onboarding: {
      backgroundColor: "#2563EB",
      secondaryBackgroundColor: "#1d4ed8",
      textColor: "#1e293b",
      secondaryTextColor: "#6b7280",
      buttonColor: "#2563EB",
      buttonTextColor: "#FFFFFF",
      fontFamily: "Inter",
      steps: [],
    },
    theme: {
      primaryColor: "#2563EB",
      secondaryColor: "#E5E7EB",
      headerBackgroundColor: "#FFFFFF",
      headerTextColor: "#1F2937",
      bodyBackgroundColor: "#F9FAFB",
      bodyTextColor: "#374151",
    },
  }
}

/** Apply live manifest.json (incl. app_builder) onto the mobile splash/onboarding shell. */
export function applyManifestToMobileAppConfig(
  base: MobileAppConfig,
  manifest: WebAppManifestBranding | null,
  displayNameOverride: string | null,
): MobileAppConfig {
  const name = displayNameOverride?.trim() || storefrontDisplayName(manifest) || base.appName
  const themed = manifestHasBrandColors(manifest)
  const primary =
    (themed &&
      (manifest?.elementPrimaryColor?.trim() ||
        manifest?.splashPrimaryColor?.trim() ||
        manifest?.theme_color?.trim())) ||
    base.theme.primaryColor
  const splashBg =
    (themed &&
      (manifest?.splashPrimaryColor?.trim() ||
        manifest?.theme_color?.trim() ||
        manifest?.background_color?.trim())) ||
    base.splash.backgroundColor
  const onboardingBg =
    (themed &&
      (manifest?.splashSecondaryColor?.trim() ||
        manifest?.background_color?.trim() ||
        manifest?.profileBgPrimary?.trim())) ||
    base.onboarding.backgroundColor
  const logo = pickManifestIconUrl(manifest) || base.splash.logo
  const splashImage = manifest?.splashImageUrl?.trim() || undefined

  const builderSteps = (manifest?.onboardingScreens || [])
    .map((s, i) => ({
      id: `step-${i + 1}`,
      title: s.title?.trim() || `Step ${i + 1}`,
      description: s.description?.trim() || "",
      image: s.image,
    }))
    .filter((s) => s.title || s.description || s.image)

  return {
    ...base,
    appName: name,
    splash: {
      ...base.splash,
      logo,
      image: splashImage,
      backgroundColor: splashBg,
    },
    onboarding: {
      ...base.onboarding,
      backgroundColor: onboardingBg,
      secondaryBackgroundColor: themed ? primary : base.onboarding.secondaryBackgroundColor,
      buttonColor: themed ? primary : base.onboarding.buttonColor,
      fontFamily: manifest?.fontFamily?.trim() || base.onboarding.fontFamily,
      steps: builderSteps.length ? builderSteps : base.onboarding.steps,
    },
    theme: {
      ...base.theme,
      primaryColor: themed ? primary : base.theme.primaryColor,
      secondaryColor: themed
        ? manifest?.elementSecondaryColor?.trim() || primary
        : base.theme.secondaryColor,
    },
  }
}
