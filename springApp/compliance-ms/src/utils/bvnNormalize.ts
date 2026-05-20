/** Extract 11-digit Nigerian BVN when present; masked values (e.g. 222********) return undefined. */
export function normalizeBvnTo11Digits(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const digits = String(raw).replace(/\D/g, '');
  return digits.length === 11 ? digits : undefined;
}
