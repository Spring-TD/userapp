/**
 * Maps Create App MS PWA template `config` (asset, splash, onboarding, appProfile, policyTerms, support, dns)
 * ↔ App Builder UI state (appElements, onboarding, appProfile, policy, support, dns).
 */

import type {
  AppElementsConfig,
  OnboardingConfig,
  OnboardingSplashScreen,
  AppProfileConfig,
  PolicyConfig,
  SupportConfig,
  DNSConfig,
} from "@/lib/services/appService"

export function emptyPwaTemplateConfig(): Record<string, unknown> {
  return {
    asset: {},
    splash: {},
    onboarding: { screens: [] },
    appProfile: {},
    policyTerms: {},
    support: {},
    dns: {},
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

export function pwaConfigToAppBuilderSlices(config: unknown): {
  appElements: Partial<AppElementsConfig>
  onboarding: Partial<OnboardingConfig>
  appProfile: Partial<AppProfileConfig>
  policy: Partial<PolicyConfig>
  support: Partial<SupportConfig>
  dns: Partial<DNSConfig>
} {
  const c = asRecord(config)
  if (!c) {
    return {
      appElements: {},
      onboarding: {},
      appProfile: {},
      policy: {},
      support: {},
      dns: {},
    }
  }

  const asset = asRecord(c.asset) || {}
  const splash = asRecord(c.splash) || {}
  const onboardingDoc = asRecord(c.onboarding) || {}
  const appProfileRaw = asRecord(c.appProfile) || {}
  const policyTerms = asRecord(c.policyTerms) || {}
  const supportRaw = asRecord(c.support) || {}
  const dnsRaw = asRecord(c.dns) || {}

  const screens = Array.isArray(onboardingDoc.screens) ? onboardingDoc.screens : []
  const screenAt = (i: number): Record<string, unknown> => asRecord(screens[i]) || {}

  const mapScreen = (i: number): OnboardingSplashScreen | undefined => {
    const s = screenAt(i)
    if (s.title == null && s.description == null && s.screenImageUrl == null) return undefined
    return {
      title: s.title != null ? String(s.title) : undefined,
      subtitle: s.description != null ? String(s.description) : undefined,
      image: s.screenImageUrl != null ? String(s.screenImageUrl) : undefined,
    }
  }

  const tc = asRecord(appProfileRaw.textColors) || {}
  const ec = asRecord(appProfileRaw.elementColors) || {}
  const bg = asRecord(appProfileRaw.backgroundColors) || {}
  const mc = asRecord(appProfileRaw.menuColors) || {}
  const aec = asRecord(appProfileRaw.auxElementColors) || {}

  const appElements: Partial<AppElementsConfig> = {
    logo: asset.logoUrl != null ? String(asset.logoUrl) : undefined,
    splash: asset.splashImageUrl != null ? String(asset.splashImageUrl) : undefined,
    siteDescription: asset.siteDescription != null ? String(asset.siteDescription) : undefined,
  }
  if (splash.primaryColor != null || splash.secondaryColor != null) {
    appElements.buttons = {
      primaryColor:
        splash.primaryColor != null ? String(splash.primaryColor) : undefined,
      secondaryColor:
        splash.secondaryColor != null ? String(splash.secondaryColor) : undefined,
    }
  }

  const onboarding: Partial<OnboardingConfig> = {
    fontFamily: appProfileRaw.fontFamily != null ? String(appProfileRaw.fontFamily) : undefined,
    splash1: mapScreen(0),
    splash2: mapScreen(1),
    splash3: mapScreen(2),
  }

  const appProfile: Partial<AppProfileConfig> = {
    textColors: {
      primary: tc.primary != null ? String(tc.primary) : undefined,
      secondary: tc.secondary != null ? String(tc.secondary) : undefined,
      aux:
        tc.auxiliary != null
          ? String(tc.auxiliary)
          : tc.aux != null
            ? String(tc.aux)
            : undefined,
    },
    elementColors: {
      primary: ec.primary != null ? String(ec.primary) : undefined,
      secondary: ec.secondary != null ? String(ec.secondary) : undefined,
    },
    backgroundColors: {
      primary: bg.primary != null ? String(bg.primary) : undefined,
      secondary: bg.secondary != null ? String(bg.secondary) : undefined,
    },
    menuColors: {
      primary: mc.primary != null ? String(mc.primary) : undefined,
      secondary: mc.secondary != null ? String(mc.secondary) : undefined,
      aux:
        mc.auxiliary != null
          ? String(mc.auxiliary)
          : mc.aux != null
            ? String(mc.aux)
            : undefined,
    },
    auxElementColors: {
      primary: aec.primary != null ? String(aec.primary) : undefined,
      secondary: aec.secondary != null ? String(aec.secondary) : undefined,
    },
  }

  const pp = asRecord(policyTerms.privacyPolicy) || {}
  const tos = asRecord(policyTerms.termsOfService) || {}
  const policy: Partial<PolicyConfig> = {}
  if (pp.title != null || pp.contentHtml != null || pp.contentText != null) {
    policy.policySection = {
      title: pp.title != null ? String(pp.title) : undefined,
      content:
        pp.contentHtml != null
          ? String(pp.contentHtml)
          : pp.contentText != null
            ? String(pp.contentText)
            : undefined,
    }
  }
  if (tos.title != null || tos.contentHtml != null || tos.contentText != null) {
    policy.termsSection = {
      title: tos.title != null ? String(tos.title) : undefined,
      content:
        tos.contentHtml != null
          ? String(tos.contentHtml)
          : tos.contentText != null
            ? String(tos.contentText)
            : undefined,
    }
  }

  const support: Partial<SupportConfig> = {
    email: supportRaw.contactEmail != null ? String(supportRaw.contactEmail) : undefined,
    phone: supportRaw.contactPhone != null ? String(supportRaw.contactPhone) : undefined,
    website: supportRaw.website != null ? String(supportRaw.website) : undefined,
    linkedinPage: supportRaw.linkedinPage != null ? String(supportRaw.linkedinPage) : undefined,
    privacyPolicyLink:
      supportRaw.privacyPolicyLink != null ? String(supportRaw.privacyPolicyLink) : undefined,
    termsLink:
      supportRaw.termsAndConditionsLink != null
        ? String(supportRaw.termsAndConditionsLink)
        : undefined,
    socialMedia: {
      instagram:
        supportRaw.instagramHandle != null ? String(supportRaw.instagramHandle) : undefined,
      twitter: supportRaw.twitterHandle != null ? String(supportRaw.twitterHandle) : undefined,
    },
  }

  const recordsRaw = Array.isArray(dnsRaw.dnsRecords) ? dnsRaw.dnsRecords : []
  const dns: Partial<DNSConfig> = {
    useCustomDomain:
      typeof dnsRaw.useCustomDomain === "boolean" ? dnsRaw.useCustomDomain : undefined,
    customDomain: dnsRaw.customDomain != null ? String(dnsRaw.customDomain) : undefined,
    baseUrl: dnsRaw.defaultAppUrl != null ? String(dnsRaw.defaultAppUrl) : undefined,
    records: recordsRaw.map((r) => {
      const x = asRecord(r) || {}
      return {
        type: String(x.type ?? ""),
        name: String(x.name ?? ""),
        value: String(x.value ?? ""),
      }
    }),
    verified:
      dnsRaw.customDomainVerificationStatus === "verified" || dnsRaw.verified === true,
  }

  return { appElements, onboarding, appProfile, policy, support, dns }
}

function screenFromSplash(s?: OnboardingSplashScreen): Record<string, string | undefined> {
  if (!s) return {}
  return {
    title: s.title,
    description: s.subtitle,
    screenImageUrl: s.image,
  }
}

export function appBuilderSlicesToPwaConfig(input: {
  appElements: AppElementsConfig
  onboarding: OnboardingConfig
  appProfile: AppProfileConfig
  policy: PolicyConfig
  support: SupportConfig
  dns: DNSConfig
}): Record<string, unknown> {
  const { appElements, onboarding, appProfile, policy, support, dns } = input

  const screens = [
    screenFromSplash(onboarding.splash1),
    screenFromSplash(onboarding.splash2),
    screenFromSplash(onboarding.splash3),
  ].filter((s) => s.title || s.description || s.screenImageUrl)

  const textColors: Record<string, string | undefined> = {
    primary: appProfile.textColors?.primary,
    secondary: appProfile.textColors?.secondary,
    auxiliary: appProfile.textColors?.aux,
  }

  const menuColors: Record<string, string | undefined> = {
    primary: appProfile.menuColors?.primary,
    secondary: appProfile.menuColors?.secondary,
    auxiliary: appProfile.menuColors?.aux,
  }

  return {
    asset: {
      logoUrl: appElements.logo,
      splashImageUrl: appElements.splash,
      siteDescription: appElements.siteDescription,
    },
    splash: {
      primaryColor: appElements.buttons?.primaryColor,
      secondaryColor: appElements.buttons?.secondaryColor,
    },
    onboarding: { screens },
    appProfile: {
      fontFamily: onboarding.fontFamily,
      textColors,
      elementColors: appProfile.elementColors,
      backgroundColors: appProfile.backgroundColors,
      menuColors,
      auxElementColors: appProfile.auxElementColors,
    },
    policyTerms: {
      privacyPolicy: {
        title: policy.policySection?.title,
        contentHtml: policy.policySection?.content,
      },
      termsOfService: {
        title: policy.termsSection?.title,
        contentHtml: policy.termsSection?.content,
      },
    },
    support: {
      contactEmail: support.email,
      contactPhone: support.phone,
      website: support.website,
      linkedinPage: support.linkedinPage,
      instagramHandle: support.socialMedia?.instagram,
      twitterHandle: support.socialMedia?.twitter,
      privacyPolicyLink: support.privacyPolicyLink,
      termsAndConditionsLink: support.termsLink,
    },
    dns: {
      useCustomDomain: dns.useCustomDomain,
      customDomain: dns.customDomain,
      defaultAppUrl: dns.baseUrl,
      dnsRecords: (dns.records || []).map((r) => ({
        type: r.type,
        name: r.name,
        value: r.value,
      })),
      customDomainVerificationStatus: dns.verified ? "verified" : "pending",
    },
  }
}

export type AppBuilderSection = "appElements" | "onboarding" | "appProfile" | "policy" | "support" | "dns"

export function sectionToPwaConfigPatch(
  section: AppBuilderSection,
  input: {
    appElements: AppElementsConfig
    onboarding: OnboardingConfig
    appProfile: AppProfileConfig
    policy: PolicyConfig
    support: SupportConfig
    dns: DNSConfig
  },
): Record<string, unknown> {
  const full = appBuilderSlicesToPwaConfig(input)
  switch (section) {
    case "appElements":
      return { asset: full.asset, splash: full.splash }
    case "onboarding":
      return {
        onboarding: full.onboarding,
        appProfile: { fontFamily: (full.appProfile as Record<string, unknown>).fontFamily },
      }
    case "appProfile":
      return { appProfile: full.appProfile }
    case "policy":
      return { policyTerms: full.policyTerms }
    case "support":
      return { support: full.support }
    case "dns":
      return { dns: full.dns }
    default:
      return {}
  }
}
