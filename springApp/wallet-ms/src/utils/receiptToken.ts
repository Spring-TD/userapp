import crypto from 'crypto';
import { config } from '../config/environment';

/**
 * Stateless HMAC token so receipt PDF links embedded in emails/in-app messages can be
 * downloaded without a full session. Scoped to a single transaction id.
 */
function sign(value: string): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');
}

export function createReceiptToken(transactionId: string): string {
  const id = transactionId.trim();
  const signature = sign(id);
  return `${id}.${signature}`;
}

export function verifyReceiptToken(token: string): string | null {
  const trimmed = (token || '').trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) return null;

  const id = trimmed.slice(0, dot);
  const signature = trimmed.slice(dot + 1);
  const expected = sign(id);

  if (signature.length !== expected.length) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  return ok ? id : null;
}
