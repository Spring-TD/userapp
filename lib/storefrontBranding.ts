import type { WebAppManifestBranding } from "@/lib/webAppManifest"

export const SF_BRAND_DEFAULTS = {
  primary: "#2563EB",
  shell: "#2563EB",
  button: "#1E40AF",
  ink: "#1E1B4B",
  tint: "#E0E7FF",
} as const

/** CSS custom properties for tenant branding (inherited under `MobileV2ThemedChrome`). */
export function buildStorefrontBrandCssVars(
  manifest: WebAppManifestBranding | null,
): Record<string, string> {
  const primary = manifest?.theme_color?.trim() || SF_BRAND_DEFAULTS.primary
  const shell =
    manifest?.background_color?.trim() || manifest?.theme_color?.trim() || SF_BRAND_DEFAULTS.shell
  const button = primary

  return {
    "--sf-primary": primary,
    "--sf-shell": shell,
    "--sf-button": button,
    "--sf-button-hover": `color-mix(in srgb, ${button} 86%, black)`,
    "--sf-ink": `color-mix(in srgb, ${button} 32%, #0f172a)`,
    "--sf-tint": `color-mix(in srgb, ${primary} 16%, white)`,
    "--sf-tint-strong": `color-mix(in srgb, ${primary} 24%, white)`,
  }
}
