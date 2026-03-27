/**
 * Deep-merge plain objects (for partial product updates: structure, about, config, etc.).
 * Arrays and non-plain objects are replaced by the source value.
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = out[key];
    if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      out[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      out[key] = sv;
    }
  }
  return out;
}
