/**
 * PWA builder templates: per-app JSON for App Creator sections.
 * Separate from core app fields / mock seed data in create-default-merchant-apps.js.
 *
 * Top-level `config` keys: asset, splash, onboarding, appProfile, policyTerms, support, dns
 * (Policy/Terms → policyTerms).
 *
 * **asset** — App Creator “Asset” tab: logo & splash images live in DigitalOcean Spaces;
 * URLs and object keys are stored here. `siteDescription` is plain text for users.
 */
export interface AppPwaAssetSection {
  /** Public URL of the app logo (Spaces CDN or origin). */
  logoUrl?: string;
  /** Spaces object key for the logo (replace/delete). */
  logoKey?: string;
  splashImageUrl?: string;
  splashImageKey?: string;
  /** Shown to end users (“Describe your app”). */
  siteDescription?: string;
}

/**
 * Splash screen tab: colors the PWA uses when the app first loads.
 * Values are CSS hex strings (#rgb, #rrggbb, or #rrggbbaa).
 */
export interface AppPwaSplashSection {
  /** Main brand / background accent (default preset if omitted). */
  primaryColor?: string;
  /** Secondary / supporting color (default preset if omitted). */
  secondaryColor?: string;
}

/** Default splash colors when none are stored (App Creator presets). */
export const APP_PWA_SPLASH_DEFAULT_COLORS: Required<AppPwaSplashSection> = {
  primaryColor: '#6B46C1',
  secondaryColor: '#E5E7EB'
};

/**
 * One onboarding step (“Screen 1 of N”). Images are stored in DigitalOcean Spaces;
 * URLs and keys mirror the asset pattern.
 */
export interface AppPwaOnboardingScreen {
  title?: string;
  description?: string;
  screenImageUrl?: string;
  screenImageKey?: string;
}

/** Ordered onboarding flow; index in `screens` matches UI screen order (0 = first). */
export interface AppPwaOnboardingSection {
  screens: AppPwaOnboardingScreen[];
}

/** App Profile → theme: text, UI elements, backgrounds, menu (CSS hex per slot). */
export interface AppPwaTextColors {
  primary?: string;
  secondary?: string;
  auxiliary?: string;
}

export interface AppPwaElementColors {
  primary?: string;
  secondary?: string;
}

export interface AppPwaBackgroundColors {
  primary?: string;
  secondary?: string;
}

export interface AppPwaMenuColors {
  primary?: string;
  secondary?: string;
  auxiliary?: string;
}

export interface AppPwaAppProfileSection {
  textColors?: AppPwaTextColors;
  elementColors?: AppPwaElementColors;
  backgroundColors?: AppPwaBackgroundColors;
  menuColors?: AppPwaMenuColors;
}

export interface AppPwaTemplateConfig {
  asset: AppPwaAssetSection;
  splash: AppPwaSplashSection;
  onboarding: AppPwaOnboardingSection;
  appProfile: AppPwaAppProfileSection;
  policyTerms: Record<string, unknown>;
  support: Record<string, unknown>;
  dns: Record<string, unknown>;
}

export type AppPwaTemplateSectionKey = keyof AppPwaTemplateConfig;

export interface AppPwaTemplate {
  id: string;
  appId: string;
  name: string;
  category?: string;
  description?: string;
  iconKey?: string;
  config: AppPwaTemplateConfig;
  /** When true, this template is the one the PWA should use (only one per app). */
  isApplied: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppPwaTemplateRequest {
  name: string;
  category?: string;
  description?: string;
  iconKey?: string;
  /** Use only section keys; omitted sections default to {}. */
  config: Record<string, unknown>;
}

export interface UpdateAppPwaTemplateRequest {
  name?: string;
  category?: string;
  description?: string;
  iconKey?: string;
  /** Merged per section (shallow merge inside each section object). */
  config?: Record<string, unknown>;
}

export type { PwaSplashColorOption } from '../constants/pwaSplashColorOptions';
export { APP_PWA_SPLASH_COLOR_OPTIONS } from '../constants/pwaSplashColorOptions';
