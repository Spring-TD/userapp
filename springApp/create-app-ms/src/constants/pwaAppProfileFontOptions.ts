/**
 * Curated font choices for App Creator “Global Styling” → font family.
 * Frontend may call GET /api/v1/pwa/font-options; saved templates use `value` in `config.appProfile.fontFamily`.
 */
export interface PwaAppProfileFontOption {
  id: string;
  label: string;
  /**
   * Value persisted on the template (first font in a CSS `font-family` stack).
   * Use web fonts your PWA loads (e.g. Google Fonts) or generic families.
   */
  value: string;
}

/** Default when none selected (matches common App Creator default). */
export const APP_PWA_APP_PROFILE_DEFAULT_FONT_FAMILY = 'Inter';

export const APP_PWA_APP_PROFILE_FONT_OPTIONS: PwaAppProfileFontOption[] = [
  { id: 'inter', label: 'Inter', value: 'Inter' },
  { id: 'system-ui', label: 'System UI', value: 'system-ui' },
  { id: 'roboto', label: 'Roboto', value: 'Roboto' },
  { id: 'open-sans', label: 'Open Sans', value: 'Open Sans' },
  { id: 'lato', label: 'Lato', value: 'Lato' },
  { id: 'montserrat', label: 'Montserrat', value: 'Montserrat' },
  { id: 'poppins', label: 'Poppins', value: 'Poppins' },
  { id: 'nunito-sans', label: 'Nunito Sans', value: 'Nunito Sans' },
  { id: 'source-sans-3', label: 'Source Sans 3', value: 'Source Sans 3' },
  { id: 'merriweather', label: 'Merriweather', value: 'Merriweather' },
  { id: 'playfair-display', label: 'Playfair Display', value: 'Playfair Display' },
  { id: 'georgia', label: 'Georgia', value: 'Georgia' },
  { id: 'times-new-roman', label: 'Times New Roman', value: 'Times New Roman' },
  { id: 'arial', label: 'Arial', value: 'Arial' },
  { id: 'verdana', label: 'Verdana', value: 'Verdana' }
];
