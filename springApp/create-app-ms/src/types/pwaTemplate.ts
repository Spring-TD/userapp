import type { PwaAutoPublishResult } from './pwaPublish';

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
  aux?: string;
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
  aux?: string;
}

export interface AppPwaAppProfileSection {
  /** Global font stack name (e.g. `Inter`, `system-ui`). */
  fontFamily?: string;
  textColors?: AppPwaTextColors;
  elementColors?: AppPwaElementColors;
  auxElementColors?: AppPwaElementColors;
  backgroundColors?: AppPwaBackgroundColors;
  menuColors?: AppPwaMenuColors;
}

/** Inline attachment for a policy/terms document (e.g. PDF or image hosted on Spaces). */
export interface AppPwaPolicyTermsMediaItem {
  url?: string;
  key?: string;
  caption?: string;
}

/**
 * One legal document (Privacy Policy or Terms of Service) from the rich-text editors.
 * - **`contentHtml`** — TipTap/HTML output (`editor.getHTML()`): canonical formatted body for rendering.
 * - **`contentJson`** — optional TipTap document (`editor.getJSON()`) for lossless reload in the editor.
 * - **`contentText`** — plain or alternate text mode if you use it.
 * - **`media`** — linked files or figures alongside the text.
 */
export interface AppPwaPolicyTermsDocument {
  /** Card heading / version label (e.g. next to the pencil icon). */
  title?: string;
  contentHtml?: string;
  contentText?: string;
  /**
   * TipTap / ProseMirror JSON document. Store with `contentHtml` so the PWA can render without the editor.
   * Must be a JSON object at the root (not an array).
   */
  contentJson?: unknown;
  media?: AppPwaPolicyTermsMediaItem[];
}

/**
 * FAQ row shown under Policy/Terms in App Creator.
 * Kept intentionally flexible because the editor payload can evolve.
 */
export interface AppPwaPolicyTermsFaqItem {
  [key: string]: unknown;
}

/** Policy / Terms tab: privacy policy and terms of service content. */
export interface AppPwaPolicyTermsSection {
  privacyPolicy?: AppPwaPolicyTermsDocument;
  termsOfService?: AppPwaPolicyTermsDocument;
  faq?: AppPwaPolicyTermsFaqItem[];
}

/**
 * Support tab (contact & links), aligned with App Creator form fields.
 * All values are optional strings; required-field rules are enforced in the UI.
 */
export interface AppPwaSupportSection {
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  linkedinPage?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  /** E.164 phone, `wa.me/...` link, or display text — App Creator / PWA may format as needed. */
  whatsapp?: string;
  privacyPolicyLink?: string;
  termsAndConditionsLink?: string;
}

/** DNS / TXT row shown in App Creator (typically returned from Vercel when adding a domain). */
export type AppPwaDnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT';

export interface AppPwaDnsRecordRow {
  type: AppPwaDnsRecordType;
  /** Name / host (e.g. `@`, `www`, `_acme-challenge`). */
  name: string;
  /** Value / target (IP, hostname, or TXT payload). */
  value: string;
}

/**
 * Custom domain & DNS (Vercel). Default host is assigned on the app (`{subdomain}.{platformDomain}`);
 * custom hostname and record rows are stored for the App Creator UI and verification flow.
 */
export interface AppPwaDnsSection {
  /** Full default origin for the app on your platform, e.g. `https://abc.springtd.com`. */
  defaultAppUrl?: string;
  /** Subdomain label only (matches `App.subdomain`). */
  subdomain?: string;
  /** Merchant toggled custom domain in App Creator. */
  useCustomDomain?: boolean;
  /** User-owned hostname (e.g. `app.client.com`). */
  customDomain?: string;
  /** Reflects whether DNS has been verified (Vercel domain status can be mirrored here). */
  customDomainVerificationStatus?: 'pending' | 'verified' | 'failed';
  /** Records the user must configure at their DNS provider (often from Vercel). */
  dnsRecords?: AppPwaDnsRecordRow[];
  /** Optional TXT token string for domain verification UI. */
  verificationTxtValue?: string;
  /** Optional opaque ids when integrating Vercel Domain / Project APIs server-side. */
  vercelDomainId?: string;
  vercelProjectId?: string;
}

export interface AppPwaTemplateConfig {
  asset: AppPwaAssetSection;
  splash: AppPwaSplashSection;
  onboarding: AppPwaOnboardingSection;
  appProfile: AppPwaAppProfileSection;
  policyTerms: AppPwaPolicyTermsSection;
  support: AppPwaSupportSection;
  dns: AppPwaDnsSection;
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

export interface AppPwaTemplateSaveResult {
  template: AppPwaTemplate;
  publish: PwaAutoPublishResult;
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
export type { PwaAppProfileFontOption } from '../constants/pwaAppProfileFontOptions';
export {
  APP_PWA_APP_PROFILE_DEFAULT_FONT_FAMILY,
  APP_PWA_APP_PROFILE_FONT_OPTIONS
} from '../constants/pwaAppProfileFontOptions';
