const SAVINGS_DEPOSIT_REF_PREFIX = 'savings-deposit:';

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
