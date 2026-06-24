import type { WebAppManifestBranding } from "@/lib/webAppManifest"
import { manifestHasBrandColors } from "@/lib/webAppManifest"

export const SF_BRAND_DEFAULTS = {
  primary: "#2563EB",
  shell: "#2563EB",
  button: "#1E40AF",
  ink: "#1E1B4B",
  tint: "#E0E7FF",
  pageBg: "#FAFAFA",
  pageBgTint: "#F5F7FF",
  accentSoft: "#EFF6FF",
} as const

/** True when manifest.json supplies theme or background colors for storefront chrome. */
export { manifestHasBrandColors } from "@/lib/webAppManifest"

/** CSS custom properties for tenant branding (inherited under `MobileV2ThemedChrome`). */
export function buildStorefrontBrandCssVars(
  manifest: WebAppManifestBranding | null,
): Record<string, string> {
  const themed = manifestHasBrandColors(manifest)

  const primary =
    themed && manifest?.theme_color?.trim() ? manifest.theme_color.trim() : SF_BRAND_DEFAULTS.primary

  const shell =
    themed && manifest?.background_color?.trim()
      ? manifest.background_color.trim()
      : themed && manifest?.theme_color?.trim()
        ? manifest.theme_color.trim()
        : SF_BRAND_DEFAULTS.shell

  const button =
    themed && manifest?.theme_color?.trim() ? manifest.theme_color.trim() : SF_BRAND_DEFAULTS.button

  const pageBg = themed
    ? `color-mix(in srgb, ${shell} 5%, white)`
    : SF_BRAND_DEFAULTS.pageBg

  const pageBgTint = themed
    ? `color-mix(in srgb, ${primary} 10%, white)`
    : SF_BRAND_DEFAULTS.pageBgTint

  const accentSoft = themed
    ? `color-mix(in srgb, ${primary} 14%, white)`
    : SF_BRAND_DEFAULTS.accentSoft

  const borderSubtle = themed
    ? `color-mix(in srgb, ${primary} 12%, #f3f4f6)`
    : "#e5e7eb"

  const borderBrand = themed
    ? `color-mix(in srgb, ${primary} 28%, #e5e7eb)`
    : "#dbeafe"

  return {
    "--sf-primary": primary,
    "--sf-shell": shell,
    "--sf-button": button,
    "--sf-button-hover": `color-mix(in srgb, ${button} 86%, black)`,
    "--sf-ink": themed
      ? `color-mix(in srgb, ${button} 32%, #0f172a)`
      : SF_BRAND_DEFAULTS.ink,
    "--sf-tint": themed
      ? `color-mix(in srgb, ${primary} 16%, white)`
      : SF_BRAND_DEFAULTS.tint,
    "--sf-tint-strong": themed
      ? `color-mix(in srgb, ${primary} 24%, white)`
      : SF_BRAND_DEFAULTS.tint,
    "--sf-page-bg": pageBg,
    "--sf-page-bg-tint": pageBgTint,
    "--sf-accent-soft": accentSoft,
    "--sf-border": borderBrand,
    "--sf-border-subtle": borderSubtle,
    /* shadcn tokens — scoped under storefront root */
    "--primary": button,
    "--primary-foreground": "#ffffff",
    "--ring": `color-mix(in srgb, ${primary} 35%, transparent)`,
    "--border": borderSubtle,
  }
}
