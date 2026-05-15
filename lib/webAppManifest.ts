import type { MobileAppConfig } from "@/hooks/useMobileConfig"

/** Subset of W3C Web App Manifest used for storefront chrome + signup copy. */
export interface WebAppManifestBranding {
  name?: string
  short_name?: string
  theme_color?: string
  background_color?: string
  icons?: { src?: string; sizes?: string; type?: string; purpose?: string }[]
}

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  return t || undefined
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
  const theme_color = asTrimmedString(o.theme_color)
  const background_color = asTrimmedString(o.background_color)

  if (!name && !short_name && !theme_color && !background_color && (!icons || icons.length === 0)) {
    return null
  }

  return {
    ...(name ? { name } : {}),
    ...(short_name ? { short_name } : {}),
    ...(theme_color ? { theme_color } : {}),
    ...(background_color ? { background_color } : {}),
    ...(icons && icons.length ? { icons } : {}),
  }
}

export function storefrontDisplayName(m: WebAppManifestBranding | null): string | null {
  if (!m) return null
  return m.short_name?.trim() || m.name?.trim() || null
}

/** Apply manifest JSON (theme_color, background_color, names) onto the default mobile shell config. */
export function applyManifestToMobileAppConfig(
  base: MobileAppConfig,
  manifest: WebAppManifestBranding | null,
  displayNameOverride: string | null,
): MobileAppConfig {
  const name = displayNameOverride?.trim() || storefrontDisplayName(manifest) || base.appName
  const primary = manifest?.theme_color?.trim() || base.theme.primaryColor
  const shell = manifest?.background_color?.trim() || manifest?.theme_color?.trim() || base.onboarding.backgroundColor

  return {
    ...base,
    appName: name,
    splash: {
      ...base.splash,
      backgroundColor: shell,
    },
    onboarding: {
      ...base.onboarding,
      backgroundColor: shell,
      secondaryBackgroundColor: primary,
      buttonColor: primary,
    },
    theme: {
      ...base.theme,
      primaryColor: primary,
    },
  }
}
