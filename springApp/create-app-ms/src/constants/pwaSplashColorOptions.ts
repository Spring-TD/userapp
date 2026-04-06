/**
 * Shared palette for App Creator splash primary/secondary pickers.
 * Frontend may import this module or call GET /api/v1/pwa/color-options.
 * Stored template values use `hex`; any valid hex is still accepted on save.
 */
export interface PwaSplashColorOption {
  id: string;
  label: string;
  /** CSS hex (#rgb, #rrggbb, or #rrggbbaa). */
  hex: string;
}

export const APP_PWA_SPLASH_COLOR_OPTIONS: PwaSplashColorOption[] = [
  { id: 'purple-600', label: 'Purple', hex: '#6B46C1' },
  { id: 'gray-200', label: 'Light gray', hex: '#E5E7EB' },
  { id: 'indigo-600', label: 'Indigo', hex: '#4F46E5' },
  { id: 'blue-600', label: 'Blue', hex: '#2563EB' },
  { id: 'cyan-600', label: 'Cyan', hex: '#0891B2' },
  { id: 'teal-600', label: 'Teal', hex: '#0D9488' },
  { id: 'emerald-600', label: 'Emerald', hex: '#059669' },
  { id: 'amber-600', label: 'Amber', hex: '#D97706' },
  { id: 'rose-600', label: 'Rose', hex: '#E11D48' },
  { id: 'pink-600', label: 'Pink', hex: '#DB2777' },
  { id: 'violet-600', label: 'Violet', hex: '#7C3AED' },
  { id: 'slate-600', label: 'Slate', hex: '#475569' },
  { id: 'slate-900', label: 'Near black', hex: '#0F172A' },
  { id: 'slate-50', label: 'Off white', hex: '#F8FAFC' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'black', label: 'Black', hex: '#000000' }
];
