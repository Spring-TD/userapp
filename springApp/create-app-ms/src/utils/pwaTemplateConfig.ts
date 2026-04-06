import { ApiError } from '../middleware/errorHandler';
import {
  APP_PWA_SPLASH_DEFAULT_COLORS,
  type AppPwaAppProfileSection,
  type AppPwaBackgroundColors,
  type AppPwaElementColors,
  type AppPwaMenuColors,
  type AppPwaPolicyTermsDocument,
  type AppPwaPolicyTermsMediaItem,
  type AppPwaPolicyTermsSection,
  type AppPwaAssetSection,
  type AppPwaOnboardingScreen,
  type AppPwaOnboardingSection,
  type AppPwaSplashSection,
  type AppPwaDnsRecordRow,
  type AppPwaDnsRecordType,
  type AppPwaDnsSection,
  type AppPwaSupportSection,
  type AppPwaTemplateConfig,
  type AppPwaTemplateSectionKey,
  type AppPwaTextColors
} from '../types/pwaTemplate';

/** Top-level keys allowed under `config.appProfile` (global styling + theme colors). */
const APP_PROFILE_KEYS = [
  'fontFamily',
  'textColors',
  'elementColors',
  'backgroundColors',
  'menuColors'
] as const;

const APP_PROFILE_COLOR_GROUP_KEYS = [
  'textColors',
  'elementColors',
  'backgroundColors',
  'menuColors'
] as const;

const APP_PROFILE_FONT_FAMILY_MAX_LEN = 120;

/** primary / secondary / auxiliary (text & menu) */
const PROFILE_TEXT_KEYS = ['primary', 'secondary', 'auxiliary'] as const;
/** primary / secondary (element & background) */
const PROFILE_PAIR_KEYS = ['primary', 'secondary'] as const;
/** primary / secondary / auxiliary (menu) */
const PROFILE_MENU_KEYS = ['primary', 'secondary', 'auxiliary'] as const;

const POLICY_TERMS_TOP_KEYS = ['privacyPolicy', 'termsOfService'] as const;
const POLICY_DOC_STRING_KEYS = ['title', 'contentHtml', 'contentText'] as const;
const POLICY_DOC_KEYS = [
  ...POLICY_DOC_STRING_KEYS,
  'media',
  'contentJson'
] as const;
const POLICY_MEDIA_ITEM_KEYS = ['url', 'key', 'caption'] as const;

const ONBOARDING_SCREEN_STRING_KEYS = [
  'title',
  'description',
  'screenImageUrl',
  'screenImageKey'
] as const;

/** Known string fields under `config.asset` (logo/splash stored in DigitalOcean Spaces). */
export const APP_PWA_ASSET_STRING_KEYS = [
  'logoUrl',
  'logoKey',
  'splashImageUrl',
  'splashImageKey',
  'siteDescription'
] as const;

/** Support tab: contact email/phone, site, social handles, policy links. */
export const APP_PWA_SUPPORT_STRING_KEYS = [
  'contactEmail',
  'contactPhone',
  'website',
  'linkedinPage',
  'instagramHandle',
  'twitterHandle',
  'privacyPolicyLink',
  'termsAndConditionsLink'
] as const;

const APP_PWA_DNS_RECORD_TYPES: AppPwaDnsRecordType[] = ['A', 'AAAA', 'CNAME', 'TXT'];

const APP_PWA_DNS_TOP_KEYS = [
  'defaultAppUrl',
  'subdomain',
  'useCustomDomain',
  'customDomain',
  'customDomainVerificationStatus',
  'dnsRecords',
  'verificationTxtValue',
  'vercelDomainId',
  'vercelProjectId'
] as const;

const APP_PWA_DNS_VERIFICATION = ['pending', 'verified', 'failed'] as const;

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

/** Top-level keys in `config`, aligned with App Creator tabs. */
export const APP_PWA_TEMPLATE_SECTION_KEYS: AppPwaTemplateSectionKey[] = [
  'asset',
  'splash',
  'onboarding',
  'appProfile',
  'policyTerms',
  'support',
  'dns'
];

const ALLOWED = new Set<string>(APP_PWA_TEMPLATE_SECTION_KEYS);

function assertSectionObject(
  sectionKey: string,
  value: unknown,
  path: string
): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, `${path}.${sectionKey} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function assertAssetSection(raw: Record<string, unknown>): AppPwaAssetSection {
  const out: Record<string, string> = {};
  for (const k of APP_PWA_ASSET_STRING_KEYS) {
    if (raw[k] !== undefined && raw[k] !== null) {
      if (typeof raw[k] !== 'string') {
        throw new ApiError(400, `config.asset.${k} must be a string`);
      }
      out[k] = raw[k];
    }
  }
  return out as AppPwaAssetSection;
}

function coerceAssetSection(raw: Record<string, unknown>): AppPwaAssetSection {
  const out: AppPwaAssetSection = {};
  for (const k of APP_PWA_ASSET_STRING_KEYS) {
    const v = raw[k];
    if (v !== undefined && typeof v === 'string') {
      (out as Record<string, string>)[k] = v;
    }
  }
  return out;
}

function assertSupportSection(raw: Record<string, unknown>): AppPwaSupportSection {
  for (const k of Object.keys(raw)) {
    if (!APP_PWA_SUPPORT_STRING_KEYS.includes(k as (typeof APP_PWA_SUPPORT_STRING_KEYS)[number])) {
      throw new ApiError(400, `config.support unknown key "${k}"`);
    }
  }
  const out: AppPwaSupportSection = {};
  for (const k of APP_PWA_SUPPORT_STRING_KEYS) {
    if (raw[k] !== undefined && raw[k] !== null) {
      if (typeof raw[k] !== 'string') {
        throw new ApiError(400, `config.support.${k} must be a string`);
      }
      (out as Record<string, string>)[k] = raw[k];
    }
  }
  return out;
}

function coerceSupportSection(raw: Record<string, unknown>): AppPwaSupportSection {
  const out: AppPwaSupportSection = {};
  for (const k of APP_PWA_SUPPORT_STRING_KEYS) {
    const v = raw[k];
    if (v !== undefined && typeof v === 'string') {
      (out as Record<string, string>)[k] = v;
    }
  }
  return out;
}

function assertDnsRecordRow(raw: unknown, path: string): AppPwaDnsRecordRow {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (k !== 'type' && k !== 'name' && k !== 'value') {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  if (typeof o.type !== 'string' || !APP_PWA_DNS_RECORD_TYPES.includes(o.type as AppPwaDnsRecordType)) {
    throw new ApiError(400, `${path}.type must be one of A, AAAA, CNAME, TXT`);
  }
  if (typeof o.name !== 'string') {
    throw new ApiError(400, `${path}.name must be a string`);
  }
  if (typeof o.value !== 'string') {
    throw new ApiError(400, `${path}.value must be a string`);
  }
  return {
    type: o.type as AppPwaDnsRecordType,
    name: o.name,
    value: o.value
  };
}

function assertDnsSection(raw: Record<string, unknown>): AppPwaDnsSection {
  for (const k of Object.keys(raw)) {
    if (!APP_PWA_DNS_TOP_KEYS.includes(k as (typeof APP_PWA_DNS_TOP_KEYS)[number])) {
      throw new ApiError(400, `config.dns unknown key "${k}"`);
    }
  }
  const out: AppPwaDnsSection = {};
  for (const k of [
    'defaultAppUrl',
    'subdomain',
    'customDomain',
    'verificationTxtValue',
    'vercelDomainId',
    'vercelProjectId'
  ] as const) {
    if (raw[k] !== undefined && raw[k] !== null) {
      if (typeof raw[k] !== 'string') {
        throw new ApiError(400, `config.dns.${k} must be a string`);
      }
      (out as Record<string, string>)[k] = raw[k];
    }
  }
  if (raw.useCustomDomain !== undefined && raw.useCustomDomain !== null) {
    if (typeof raw.useCustomDomain !== 'boolean') {
      throw new ApiError(400, 'config.dns.useCustomDomain must be a boolean');
    }
    out.useCustomDomain = raw.useCustomDomain;
  }
  if (raw.customDomainVerificationStatus !== undefined && raw.customDomainVerificationStatus !== null) {
    const s = raw.customDomainVerificationStatus;
    if (typeof s !== 'string' || !APP_PWA_DNS_VERIFICATION.includes(s as (typeof APP_PWA_DNS_VERIFICATION)[number])) {
      throw new ApiError(
        400,
        'config.dns.customDomainVerificationStatus must be one of pending, verified, failed'
      );
    }
    out.customDomainVerificationStatus = s as AppPwaDnsSection['customDomainVerificationStatus'];
  }
  if (raw.dnsRecords !== undefined && raw.dnsRecords !== null) {
    if (!Array.isArray(raw.dnsRecords)) {
      throw new ApiError(400, 'config.dns.dnsRecords must be an array');
    }
    out.dnsRecords = raw.dnsRecords.map((row, i) =>
      assertDnsRecordRow(row, `config.dns.dnsRecords[${i}]`)
    );
  }
  return out;
}

function coerceDnsSection(raw: Record<string, unknown>): AppPwaDnsSection {
  const filtered: Record<string, unknown> = {};
  for (const k of APP_PWA_DNS_TOP_KEYS) {
    if (raw[k] !== undefined) {
      filtered[k] = raw[k];
    }
  }
  try {
    return assertDnsSection(filtered);
  } catch {
    return {};
  }
}

function assertSplashSection(raw: Record<string, unknown>): AppPwaSplashSection {
  let primary: string | undefined;
  let secondary: string | undefined;
  if (raw.primaryColor !== undefined && raw.primaryColor !== null) {
    if (typeof raw.primaryColor !== 'string') {
      throw new ApiError(400, 'config.splash.primaryColor must be a string');
    }
    const t = raw.primaryColor.trim();
    if (!isValidHexColor(t)) {
      throw new ApiError(
        400,
        'config.splash.primaryColor must be a CSS hex color (#rgb, #rrggbb, or #rrggbbaa)'
      );
    }
    primary = t;
  }
  if (raw.secondaryColor !== undefined && raw.secondaryColor !== null) {
    if (typeof raw.secondaryColor !== 'string') {
      throw new ApiError(400, 'config.splash.secondaryColor must be a string');
    }
    const t = raw.secondaryColor.trim();
    if (!isValidHexColor(t)) {
      throw new ApiError(
        400,
        'config.splash.secondaryColor must be a CSS hex color (#rgb, #rrggbb, or #rrggbbaa)'
      );
    }
    secondary = t;
  }
  return {
    primaryColor: primary ?? APP_PWA_SPLASH_DEFAULT_COLORS.primaryColor,
    secondaryColor: secondary ?? APP_PWA_SPLASH_DEFAULT_COLORS.secondaryColor
  };
}

function coerceSplashSection(raw: Record<string, unknown>): AppPwaSplashSection {
  let primary: string | undefined;
  let secondary: string | undefined;
  if (typeof raw.primaryColor === 'string' && isValidHexColor(raw.primaryColor)) {
    primary = raw.primaryColor.trim();
  }
  if (typeof raw.secondaryColor === 'string' && isValidHexColor(raw.secondaryColor)) {
    secondary = raw.secondaryColor.trim();
  }
  return {
    primaryColor: primary ?? APP_PWA_SPLASH_DEFAULT_COLORS.primaryColor,
    secondaryColor: secondary ?? APP_PWA_SPLASH_DEFAULT_COLORS.secondaryColor
  };
}

function assertOnboardingScreen(item: unknown, index: number): AppPwaOnboardingScreen {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    throw new ApiError(400, `config.onboarding.screens[${index}] must be an object`);
  }
  const o = item as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!ONBOARDING_SCREEN_STRING_KEYS.includes(k as (typeof ONBOARDING_SCREEN_STRING_KEYS)[number])) {
      throw new ApiError(400, `config.onboarding.screens[${index}] unknown key "${k}"`);
    }
  }
  const out: AppPwaOnboardingScreen = {};
  for (const k of ONBOARDING_SCREEN_STRING_KEYS) {
    if (o[k] !== undefined && o[k] !== null) {
      if (typeof o[k] !== 'string') {
        throw new ApiError(400, `config.onboarding.screens[${index}].${k} must be a string`);
      }
      (out as Record<string, string>)[k] = o[k];
    }
  }
  return out;
}

function coerceOnboardingScreen(item: Record<string, unknown>): AppPwaOnboardingScreen {
  const out: AppPwaOnboardingScreen = {};
  for (const k of ONBOARDING_SCREEN_STRING_KEYS) {
    const v = item[k];
    if (v !== undefined && typeof v === 'string') {
      (out as Record<string, string>)[k] = v;
    }
  }
  return out;
}

function assertOnboardingSection(raw: Record<string, unknown>): AppPwaOnboardingSection {
  for (const k of Object.keys(raw)) {
    if (k !== 'screens') {
      throw new ApiError(400, `config.onboarding unknown key "${k}"`);
    }
  }
  if (raw.screens === undefined || raw.screens === null) {
    return { screens: [] };
  }
  if (!Array.isArray(raw.screens)) {
    throw new ApiError(400, 'config.onboarding.screens must be an array');
  }
  const screens = raw.screens.map((item, i) => assertOnboardingScreen(item, i));
  return { screens };
}

function coerceOnboardingSection(raw: Record<string, unknown>): AppPwaOnboardingSection {
  if (!raw.screens || !Array.isArray(raw.screens)) {
    return { screens: [] };
  }
  const screens = raw.screens
    .filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item) => coerceOnboardingScreen(item as Record<string, unknown>));
  return { screens };
}

function assertHexAtPath(path: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, `${path} must be a string`);
  }
  const t = value.trim();
  if (!isValidHexColor(t)) {
    throw new ApiError(400, `${path} must be a CSS hex color (#rgb, #rrggbb, or #rrggbbaa)`);
  }
  return t;
}

function parseColorSubgroup(
  raw: unknown,
  path: string,
  allowed: readonly string[]
): Record<string, string> | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const out: Record<string, string> = {};
  for (const k of allowed) {
    if (o[k] !== undefined && o[k] !== null) {
      out[k] = assertHexAtPath(`${path}.${k}`, o[k]);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function assertAppProfileSection(raw: Record<string, unknown>): AppPwaAppProfileSection {
  for (const k of Object.keys(raw)) {
    if (!APP_PROFILE_KEYS.includes(k as (typeof APP_PROFILE_KEYS)[number])) {
      throw new ApiError(400, `config.appProfile unknown key "${k}"`);
    }
  }
  const out: AppPwaAppProfileSection = {};
  if (raw.fontFamily !== undefined && raw.fontFamily !== null) {
    if (typeof raw.fontFamily !== 'string') {
      throw new ApiError(400, 'config.appProfile.fontFamily must be a string');
    }
    const t = raw.fontFamily.trim();
    if (t.length > APP_PROFILE_FONT_FAMILY_MAX_LEN) {
      throw new ApiError(
        400,
        `config.appProfile.fontFamily must be at most ${APP_PROFILE_FONT_FAMILY_MAX_LEN} characters`
      );
    }
    if (t.length > 0) {
      out.fontFamily = t;
    }
  }
  if (raw.textColors !== undefined) {
    out.textColors = parseColorSubgroup(
      raw.textColors,
      'config.appProfile.textColors',
      PROFILE_TEXT_KEYS
    ) as AppPwaAppProfileSection['textColors'];
  }
  if (raw.elementColors !== undefined) {
    out.elementColors = parseColorSubgroup(
      raw.elementColors,
      'config.appProfile.elementColors',
      PROFILE_PAIR_KEYS
    ) as AppPwaAppProfileSection['elementColors'];
  }
  if (raw.backgroundColors !== undefined) {
    out.backgroundColors = parseColorSubgroup(
      raw.backgroundColors,
      'config.appProfile.backgroundColors',
      PROFILE_PAIR_KEYS
    ) as AppPwaAppProfileSection['backgroundColors'];
  }
  if (raw.menuColors !== undefined) {
    out.menuColors = parseColorSubgroup(
      raw.menuColors,
      'config.appProfile.menuColors',
      PROFILE_MENU_KEYS
    ) as AppPwaAppProfileSection['menuColors'];
  }
  return out;
}

function coerceColorSubgroup(
  raw: unknown,
  allowed: readonly string[]
): Record<string, string> | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of allowed) {
    const v = o[k];
    if (typeof v === 'string' && isValidHexColor(v)) {
      out[k] = v.trim();
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function coerceAppProfileSection(raw: Record<string, unknown>): AppPwaAppProfileSection {
  const out: AppPwaAppProfileSection = {};
  if (typeof raw.fontFamily === 'string') {
    const t = raw.fontFamily.trim();
    if (t.length > 0 && t.length <= APP_PROFILE_FONT_FAMILY_MAX_LEN) {
      out.fontFamily = t;
    }
  }
  for (const k of APP_PROFILE_COLOR_GROUP_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) {
      continue;
    }
    const v = raw[k];
    if (k === 'textColors') {
      const t = coerceColorSubgroup(v, PROFILE_TEXT_KEYS);
      if (t) out.textColors = t;
    } else if (k === 'elementColors') {
      const t = coerceColorSubgroup(v, PROFILE_PAIR_KEYS);
      if (t) out.elementColors = t;
    } else if (k === 'backgroundColors') {
      const t = coerceColorSubgroup(v, PROFILE_PAIR_KEYS);
      if (t) out.backgroundColors = t;
    } else if (k === 'menuColors') {
      const t = coerceColorSubgroup(v, PROFILE_MENU_KEYS);
      if (t) out.menuColors = t;
    }
  }
  return out;
}

function mergeColorSubgroup(
  existing: Record<string, string> | AppPwaTextColors | AppPwaElementColors | AppPwaBackgroundColors | AppPwaMenuColors | undefined,
  patch: unknown,
  path: string,
  allowed: readonly string[]
): Record<string, string> | undefined {
  if (patch === undefined) {
    return existing as Record<string, string> | undefined;
  }
  if (patch === null) {
    return undefined;
  }
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const p = patch as Record<string, unknown>;
  for (const k of Object.keys(p)) {
    if (!allowed.includes(k)) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const prior = (existing || {}) as Record<string, string>;
  const merged: Record<string, string> = { ...prior };
  for (const k of allowed) {
    if (!Object.prototype.hasOwnProperty.call(p, k)) {
      continue;
    }
    const v = p[k];
    if (v === null || v === undefined) {
      delete merged[k];
    } else {
      merged[k] = assertHexAtPath(`${path}.${k}`, v);
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergeAppProfileDeep(
  existing: AppPwaAppProfileSection,
  patch: Record<string, unknown>
): AppPwaAppProfileSection {
  for (const k of Object.keys(patch)) {
    if (!APP_PROFILE_KEYS.includes(k as (typeof APP_PROFILE_KEYS)[number])) {
      throw new ApiError(400, `config.appProfile unknown key "${k}"`);
    }
  }
  const out: AppPwaAppProfileSection = { ...existing };
  if (Object.prototype.hasOwnProperty.call(patch, 'fontFamily')) {
    const v = patch.fontFamily;
    if (v === null || v === undefined || v === '') {
      delete out.fontFamily;
    } else if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > APP_PROFILE_FONT_FAMILY_MAX_LEN) {
        throw new ApiError(
          400,
          `config.appProfile.fontFamily must be at most ${APP_PROFILE_FONT_FAMILY_MAX_LEN} characters`
        );
      }
      if (t.length > 0) {
        out.fontFamily = t;
      } else {
        delete out.fontFamily;
      }
    } else {
      throw new ApiError(400, 'config.appProfile.fontFamily must be a string');
    }
  }
  if (patch.textColors !== undefined) {
    out.textColors = mergeColorSubgroup(
      existing.textColors,
      patch.textColors,
      'config.appProfile.textColors',
      PROFILE_TEXT_KEYS
    );
  }
  if (patch.elementColors !== undefined) {
    out.elementColors = mergeColorSubgroup(
      existing.elementColors,
      patch.elementColors,
      'config.appProfile.elementColors',
      PROFILE_PAIR_KEYS
    );
  }
  if (patch.backgroundColors !== undefined) {
    out.backgroundColors = mergeColorSubgroup(
      existing.backgroundColors,
      patch.backgroundColors,
      'config.appProfile.backgroundColors',
      PROFILE_PAIR_KEYS
    );
  }
  if (patch.menuColors !== undefined) {
    out.menuColors = mergeColorSubgroup(
      existing.menuColors,
      patch.menuColors,
      'config.appProfile.menuColors',
      PROFILE_MENU_KEYS
    );
  }
  return out;
}

function assertPolicyString(path: string, value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ApiError(400, `${path} must be a string`);
  }
  return value;
}

function assertPolicyMediaItem(raw: unknown, path: string): AppPwaPolicyTermsMediaItem {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!POLICY_MEDIA_ITEM_KEYS.includes(k as (typeof POLICY_MEDIA_ITEM_KEYS)[number])) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const out: AppPwaPolicyTermsMediaItem = {};
  for (const k of POLICY_MEDIA_ITEM_KEYS) {
    if (o[k] === undefined || o[k] === null) {
      continue;
    }
    if (typeof o[k] !== 'string') {
      throw new ApiError(400, `${path}.${k} must be a string`);
    }
    (out as Record<string, string>)[k] = o[k] as string;
  }
  return out;
}

function assertPolicyMediaArray(raw: unknown, path: string): AppPwaPolicyTermsMediaItem[] {
  if (!Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be an array`);
  }
  return raw.map((item, i) => assertPolicyMediaItem(item, `${path}[${i}]`));
}

/** TipTap `getJSON()` root must be a non-null object (not a top-level array). */
function assertPolicyContentJson(raw: unknown, path: string): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be a JSON object`);
  }
  return raw;
}

function parsePolicyDocument(
  raw: unknown,
  path: string
): AppPwaPolicyTermsDocument | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const o = raw as Record<string, unknown>;
  for (const k of Object.keys(o)) {
    if (!POLICY_DOC_KEYS.includes(k as (typeof POLICY_DOC_KEYS)[number])) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const out: AppPwaPolicyTermsDocument = {};
  for (const k of POLICY_DOC_STRING_KEYS) {
    const v = assertPolicyString(`${path}.${k}`, o[k]);
    if (v !== undefined) {
      (out as Record<string, string>)[k] = v;
    }
  }
  if (o.media !== undefined) {
    if (o.media === null) {
      throw new ApiError(400, `${path}.media must be an array`);
    }
    out.media = assertPolicyMediaArray(o.media, `${path}.media`);
  }
  if (o.contentJson !== undefined) {
    if (o.contentJson === null) {
      throw new ApiError(400, `${path}.contentJson must be a JSON object`);
    }
    out.contentJson = assertPolicyContentJson(o.contentJson, `${path}.contentJson`);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function assertPolicyTermsSection(raw: Record<string, unknown>): AppPwaPolicyTermsSection {
  for (const k of Object.keys(raw)) {
    if (!POLICY_TERMS_TOP_KEYS.includes(k as (typeof POLICY_TERMS_TOP_KEYS)[number])) {
      throw new ApiError(400, `config.policyTerms unknown key "${k}"`);
    }
  }
  const out: AppPwaPolicyTermsSection = {};
  if (raw.privacyPolicy !== undefined) {
    out.privacyPolicy = parsePolicyDocument(
      raw.privacyPolicy,
      'config.policyTerms.privacyPolicy'
    );
  }
  if (raw.termsOfService !== undefined) {
    out.termsOfService = parsePolicyDocument(
      raw.termsOfService,
      'config.policyTerms.termsOfService'
    );
  }
  return out;
}

function coercePolicyDocument(raw: unknown): AppPwaPolicyTermsDocument | undefined {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const out: AppPwaPolicyTermsDocument = {};
  for (const k of POLICY_DOC_STRING_KEYS) {
    const v = o[k];
    if (typeof v === 'string') {
      (out as Record<string, string>)[k] = v;
    }
  }
  if (Array.isArray(o.media)) {
    const items: AppPwaPolicyTermsMediaItem[] = [];
    for (const item of o.media) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const mi = item as Record<string, unknown>;
        const entry: AppPwaPolicyTermsMediaItem = {};
        for (const mk of POLICY_MEDIA_ITEM_KEYS) {
          const mv = mi[mk];
          if (typeof mv === 'string') {
            (entry as Record<string, string>)[mk] = mv;
          }
        }
        items.push(entry);
      }
    }
    out.media = items;
  }
  if (
    o.contentJson !== undefined &&
    o.contentJson !== null &&
    typeof o.contentJson === 'object' &&
    !Array.isArray(o.contentJson)
  ) {
    out.contentJson = o.contentJson;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function coercePolicyTermsSection(raw: Record<string, unknown>): AppPwaPolicyTermsSection {
  const out: AppPwaPolicyTermsSection = {};
  if (raw.privacyPolicy !== undefined) {
    const d = coercePolicyDocument(raw.privacyPolicy);
    if (d) {
      out.privacyPolicy = d;
    }
  }
  if (raw.termsOfService !== undefined) {
    const d = coercePolicyDocument(raw.termsOfService);
    if (d) {
      out.termsOfService = d;
    }
  }
  return out;
}

function mergePolicyDocument(
  existing: AppPwaPolicyTermsDocument | undefined,
  patch: unknown,
  path: string
): AppPwaPolicyTermsDocument | undefined {
  if (patch === undefined) {
    return existing;
  }
  if (patch === null) {
    return undefined;
  }
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ApiError(400, `${path} must be an object`);
  }
  const p = patch as Record<string, unknown>;
  for (const k of Object.keys(p)) {
    if (!POLICY_DOC_KEYS.includes(k as (typeof POLICY_DOC_KEYS)[number])) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const merged: AppPwaPolicyTermsDocument = { ...(existing || {}) };
  for (const k of POLICY_DOC_STRING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(p, k)) {
      continue;
    }
    const v = p[k];
    if (v === null || v === undefined) {
      delete merged[k];
    } else if (typeof v === 'string') {
      merged[k] = v;
    } else {
      throw new ApiError(400, `${path}.${k} must be a string`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(p, 'media')) {
    const v = p.media;
    if (v === null || v === undefined) {
      delete merged.media;
    } else {
      merged.media = assertPolicyMediaArray(v, `${path}.media`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(p, 'contentJson')) {
    const v = p.contentJson;
    if (v === null || v === undefined) {
      delete merged.contentJson;
    } else {
      merged.contentJson = assertPolicyContentJson(v, `${path}.contentJson`);
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function mergePolicyTermsDeep(
  existing: AppPwaPolicyTermsSection,
  patch: Record<string, unknown>
): AppPwaPolicyTermsSection {
  for (const k of Object.keys(patch)) {
    if (!POLICY_TERMS_TOP_KEYS.includes(k as (typeof POLICY_TERMS_TOP_KEYS)[number])) {
      throw new ApiError(400, `config.policyTerms unknown key "${k}"`);
    }
  }
  const out: AppPwaPolicyTermsSection = { ...existing };
  if (patch.privacyPolicy !== undefined) {
    out.privacyPolicy = mergePolicyDocument(
      existing.privacyPolicy,
      patch.privacyPolicy,
      'config.policyTerms.privacyPolicy'
    );
  }
  if (patch.termsOfService !== undefined) {
    out.termsOfService = mergePolicyDocument(
      existing.termsOfService,
      patch.termsOfService,
      'config.policyTerms.termsOfService'
    );
  }
  return out;
}

/** Legacy or partial DB documents → always seven section objects. */
export function coerceAppPwaTemplateConfig(existing: unknown): AppPwaTemplateConfig {
  const raw =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const out = {} as AppPwaTemplateConfig;
  for (const key of APP_PWA_TEMPLATE_SECTION_KEYS) {
    const v = raw[key];
    const section =
      v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)
        ? { ...(v as Record<string, unknown>) }
        : {};
    if (key === 'asset') {
      out[key] = coerceAssetSection(section);
    } else if (key === 'splash') {
      out[key] = coerceSplashSection(section);
    } else if (key === 'onboarding') {
      out[key] = coerceOnboardingSection(section);
    } else if (key === 'appProfile') {
      out[key] = coerceAppProfileSection(section);
    } else if (key === 'policyTerms') {
      out[key] = coercePolicyTermsSection(section);
    } else if (key === 'support') {
      out[key] = coerceSupportSection(section);
    } else if (key === 'dns') {
      out[key] = coerceDnsSection(section);
    }
  }
  return out;
}

/**
 * Full config for create: every section exists (default {}), only allowed top-level keys.
 */
export function normalizeAppPwaTemplateConfigForCreate(
  input: Record<string, unknown>
): AppPwaTemplateConfig {
  for (const k of Object.keys(input)) {
    if (!ALLOWED.has(k)) {
      throw new ApiError(
        400,
        `Unknown config key "${k}". Allowed top-level keys: ${APP_PWA_TEMPLATE_SECTION_KEYS.join(', ')}`
      );
    }
  }

  const out = {} as AppPwaTemplateConfig;
  for (const key of APP_PWA_TEMPLATE_SECTION_KEYS) {
    const raw = assertSectionObject(key, input[key], 'config');
    if (key === 'asset') {
      out[key] = assertAssetSection(raw);
    } else if (key === 'splash') {
      out[key] = assertSplashSection(raw);
    } else if (key === 'onboarding') {
      out[key] = assertOnboardingSection(raw);
    } else if (key === 'appProfile') {
      out[key] = assertAppProfileSection(raw);
    } else if (key === 'policyTerms') {
      out[key] = assertPolicyTermsSection(raw);
    } else if (key === 'support') {
      out[key] = assertSupportSection(raw);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

/** Partial config on update: only listed sections are merged; unknown top-level keys rejected. */
export function mergeAppPwaTemplateConfig(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>
): AppPwaTemplateConfig {
  for (const k of Object.keys(patch)) {
    if (!ALLOWED.has(k)) {
      throw new ApiError(
        400,
        `Unknown config key "${k}". Allowed top-level keys: ${APP_PWA_TEMPLATE_SECTION_KEYS.join(', ')}`
      );
    }
  }

  const base = coerceAppPwaTemplateConfig(existing);

  for (const key of APP_PWA_TEMPLATE_SECTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      const next = assertSectionObject(key, patch[key], 'config');
      if (key === 'asset') {
        base[key] = assertAssetSection({
          ...(base[key] as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      } else if (key === 'splash') {
        base[key] = assertSplashSection({
          ...(base[key] as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      } else if (key === 'onboarding') {
        base[key] = assertOnboardingSection({
          ...(base[key] as unknown as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      } else if (key === 'appProfile') {
        base[key] = mergeAppProfileDeep(
          base[key] as AppPwaAppProfileSection,
          next
        );
      } else if (key === 'policyTerms') {
        base[key] = mergePolicyTermsDeep(
          base[key] as AppPwaPolicyTermsSection,
          next
        );
      } else if (key === 'support') {
        base[key] = assertSupportSection({
          ...(base[key] as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      } else if (key === 'dns') {
        base[key] = assertDnsSection({
          ...(base[key] as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      }
    }
  }

  return base;
}
