import countries from 'i18n-iso-countries';

/**
 * Maps a user-entered country (English name, alias, ISO alpha-2, or alpha-3) to ISO 3166-1 alpha-2 uppercase.
 */
export function normalizeCountryToAlpha2(input: string | undefined | null): string | undefined {
  if (input == null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, ' ');
  const upper = compact.toUpperCase();

  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper) && countries.isValid(upper)) {
    return upper;
  }

  if (upper.length === 3 && /^[A-Z]{3}$/.test(upper)) {
    const alpha2 = countries.alpha3ToAlpha2(upper);
    if (alpha2 && countries.isValid(alpha2)) {
      return alpha2;
    }
  }

  return (
    countries.getAlpha2Code(compact, 'en') ?? countries.getSimpleAlpha2Code(compact, 'en') ?? undefined
  );
}
