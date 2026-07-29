import axios from 'axios';

/** Fuspay modular KYC branding keys (tenant integration guide). */
export type FuspayBranding = {
  brand_name: string;
  brand_logo?: string;
  bg_color: string;
  text_color: string;
  button_color: string;
};

/** Platform defaults when manifest / caller branding is unavailable. */
export const FUSPAY_PLATFORM_BRANDING_DEFAULTS: FuspayBranding = {
  brand_name: 'Fuspay',
  bg_color: '#FFFFFF',
  text_color: '#212020',
  button_color: '#2925FA'
};

function normalizeHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(withHash)) {
    return undefined;
  }
  return withHash.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  let raw = normalized.slice(1);
  if (raw.length === 3) {
    raw = raw
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (raw.length < 6) return null;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return null;
  return { r, g, b };
}

/** Pick readable body text on the given background (Fuspay derives accents from palette). */
export function deriveTextColorFromBackground(bgColor: string): string {
  const rgb = hexToRgb(bgColor);
  if (!rgb) return FUSPAY_PLATFORM_BRANDING_DEFAULTS.text_color;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#212020' : '#FFFFFF';
}

function isPublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function mapManifestToFuspayBranding(manifest: Record<string, unknown>): FuspayBranding {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const firstIcon = icons.find(
    (icon) => icon && typeof icon === 'object' && isPublicHttpsUrl((icon as { src?: unknown }).src)
  ) as { src?: string } | undefined;

  const brandName =
    (typeof manifest.name === 'string' && manifest.name.trim()) ||
    (typeof manifest.short_name === 'string' && manifest.short_name.trim()) ||
    FUSPAY_PLATFORM_BRANDING_DEFAULTS.brand_name;

  const buttonColor =
    normalizeHexColor(manifest.theme_color) || FUSPAY_PLATFORM_BRANDING_DEFAULTS.button_color;
  const bgColor =
    normalizeHexColor(manifest.background_color) || FUSPAY_PLATFORM_BRANDING_DEFAULTS.bg_color;
  const textColor = deriveTextColorFromBackground(bgColor);

  const branding: FuspayBranding = {
    brand_name: brandName,
    bg_color: bgColor,
    text_color: textColor,
    button_color: buttonColor
  };

  if (firstIcon?.src) {
    branding.brand_logo = firstIcon.src.trim();
  }

  return branding;
}

export function buildCreateAppManifestUrl(createAppServiceBaseUrl: string, appId: string): string | undefined {
  const raw = createAppServiceBaseUrl?.trim();
  if (!raw || !appId?.trim()) return undefined;

  let base = raw.replace(/\/$/, '');
  if (base.endsWith('/api/v1/apps')) {
    base = base.slice(0, -'/api/v1/apps'.length);
  } else if (base.endsWith('/api/v1')) {
    base = base.slice(0, -'/api/v1'.length);
  }

  return `${base}/api/v1/apps/${encodeURIComponent(appId.trim())}/pwa/manifest.webmanifest`;
}

export function mergeFuspayBranding(
  base: FuspayBranding,
  override?: Record<string, unknown> | null
): FuspayBranding {
  if (!override || typeof override !== 'object') {
    return base;
  }

  const bgColor =
    normalizeHexColor(override.bg_color) || base.bg_color;
  const textColor =
    normalizeHexColor(override.text_color) ||
    (override.bg_color ? deriveTextColorFromBackground(bgColor) : base.text_color);

  const merged: FuspayBranding = {
    brand_name:
      (typeof override.brand_name === 'string' && override.brand_name.trim()) || base.brand_name,
    bg_color: bgColor,
    text_color: textColor,
    button_color:
      normalizeHexColor(override.button_color) || base.button_color
  };

  if (isPublicHttpsUrl(override.brand_logo)) {
    merged.brand_logo = override.brand_logo.trim();
  } else if (base.brand_logo) {
    merged.brand_logo = base.brand_logo;
  }

  return merged;
}

/**
 * Resolve tenant branding from create-app-ms published PWA manifest.
 * Falls back to Fuspay platform defaults.
 */
export async function resolveFuspayBrandingForApp(
  createAppServiceBaseUrl: string,
  appId?: string,
  override?: Record<string, unknown> | null
): Promise<FuspayBranding> {
  let base: FuspayBranding = { ...FUSPAY_PLATFORM_BRANDING_DEFAULTS };

  const manifestUrl = appId ? buildCreateAppManifestUrl(createAppServiceBaseUrl, appId) : undefined;
  if (manifestUrl) {
    try {
      const response = await axios.get<Record<string, unknown>>(manifestUrl, { timeout: 5000 });
      const manifest = response?.data && typeof response.data === 'object' ? response.data : {};
      base = mapManifestToFuspayBranding(manifest);
    } catch {
      // keep platform defaults
    }
  }

  if (override && typeof override === 'object' && Object.keys(override).length > 0) {
    return mergeFuspayBranding(base, override);
  }

  return base;
}
