import { ApiError } from '../middleware/errorHandler';
import {
  APP_PWA_SPLASH_DEFAULT_COLORS,
  type AppPwaAppProfileSection,
  type AppPwaAssetSection,
  type AppPwaOnboardingScreen,
  type AppPwaOnboardingSection,
  type AppPwaSplashSection,
  type AppPwaTemplateConfig,
  type AppPwaTemplateSectionKey
} from '../types/pwaTemplate';

const APP_PROFILE_GROUP_KEYS = [
  'textColors',
  'elementColors',
  'backgroundColors',
  'menuColors'
] as const;

/** primary / secondary / auxiliary (text & menu) */
const PROFILE_TEXT_KEYS = ['primary', 'secondary', 'auxiliary'] as const;
/** primary / secondary (element & background) */
const PROFILE_PAIR_KEYS = ['primary', 'secondary'] as const;
/** primary / secondary / auxiliary (menu) */
const PROFILE_MENU_KEYS = ['primary', 'secondary', 'auxiliary'] as const;

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
    if (!APP_PROFILE_GROUP_KEYS.includes(k as (typeof APP_PROFILE_GROUP_KEYS)[number])) {
      throw new ApiError(400, `config.appProfile unknown key "${k}"`);
    }
  }
  const out: AppPwaAppProfileSection = {};
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
  for (const k of APP_PROFILE_GROUP_KEYS) {
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
  existing: Record<string, string> | undefined,
  patch: unknown,
  path: string,
  allowed: readonly string[]
): Record<string, string> | undefined {
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
    if (!allowed.includes(k)) {
      throw new ApiError(400, `${path} unknown key "${k}"`);
    }
  }
  const merged: Record<string, string> = { ...(existing || {}) };
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
    if (!APP_PROFILE_GROUP_KEYS.includes(k as (typeof APP_PROFILE_GROUP_KEYS)[number])) {
      throw new ApiError(400, `config.appProfile unknown key "${k}"`);
    }
  }
  const out: AppPwaAppProfileSection = { ...existing };
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
    } else {
      out[key] = section;
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
          ...(base[key] as Record<string, unknown>),
          ...next
        } as Record<string, unknown>);
      } else if (key === 'appProfile') {
        base[key] = mergeAppProfileDeep(
          base[key] as AppPwaAppProfileSection,
          next
        );
      } else {
        base[key] = { ...base[key], ...next };
      }
    }
  }

  return base;
}
