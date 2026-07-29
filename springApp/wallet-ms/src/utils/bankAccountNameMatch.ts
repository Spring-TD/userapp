const NAME_TITLES = new Set([
  'MR',
  'MRS',
  'MISS',
  'MS',
  'DR',
  'PROF',
  'CHIEF',
  'ENGR',
  'BARR',
  'ALH',
  'HON',
  'SIR',
  'MALLAM',
  'OTUNBA'
]);

/** Normalize a person or bank account name for comparison. */
export function normalizePersonName(input: string): string {
  return input
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Significant name tokens (drops titles and single-character fragments). */
export function nameTokens(name: string): string[] {
  return normalizePersonName(name)
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !NAME_TITLES.has(token));
}

/**
 * Returns true when the bank account holder name closely matches the KYC/BVN legal name.
 * Requires every significant KYC token to appear in the bank account name.
 */
export function bankAccountNameMatchesKyc(bankAccountName: string, kycLegalName: string): boolean {
  const bankNorm = normalizePersonName(bankAccountName);
  const kycNorm = normalizePersonName(kycLegalName);
  if (!bankNorm || !kycNorm) return false;
  if (bankNorm === kycNorm) return true;

  const kycTokens = nameTokens(kycLegalName);
  if (kycTokens.length === 0) return false;

  const bankTokens = new Set(nameTokens(bankAccountName));

  const allKycTokensPresent = kycTokens.every(
    (token) => bankTokens.has(token) || bankNorm.includes(token)
  );
  if (!allKycTokensPresent) return false;

  if (kycTokens.length === 1) return true;

  const exactTokenMatches = kycTokens.filter((token) => bankTokens.has(token)).length;
  return exactTokenMatches >= Math.min(2, kycTokens.length);
}

/** True when two bank-account holder names refer to the same person (reordered/extra tokens allowed). */
export function bankAccountNamesCloselyMatch(nameA: string, nameB: string): boolean {
  return bankAccountNameMatchesKyc(nameA, nameB) || bankAccountNameMatchesKyc(nameB, nameA);
}
