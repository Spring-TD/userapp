function truthyEnv(v?: string): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

export const legerblockWebhookConfig = {
  enabled: truthyEnv(process.env.LEGERBLOCK_WEBHOOK_ENABLED || 'true'),
  /** Shared secret for HMAC-SHA512 of the raw request body. */
  secret: process.env.LEGERBLOCK_WEBHOOK_SECRET || '',
  /** When true, reject requests that fail signature verification. */
  enforceSignature: truthyEnv(process.env.LEGERBLOCK_WEBHOOK_ENFORCE_SIGNATURE || 'false')
};
