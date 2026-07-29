const SAVINGS_DEPOSIT_REF_PREFIX = 'savings-deposit:';

/** PayOnUs / bank transfer merchant reference → Plata upstream application id. */
export function parseSavingsDepositUpstreamApplicationId(merchantReference?: string): string | undefined {
  if (!merchantReference) return undefined;
  const trimmed = merchantReference.trim();
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith(SAVINGS_DEPOSIT_REF_PREFIX)) {
    return undefined;
  }
  const applicationId = trimmed.slice(SAVINGS_DEPOSIT_REF_PREFIX.length).trim();
  return applicationId || undefined;
}

export function buildSavingsDepositMerchantReference(upstreamApplicationId: string): string {
  return `${SAVINGS_DEPOSIT_REF_PREFIX}${upstreamApplicationId.trim()}`;
}
