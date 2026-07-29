import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PIN_REGEX = /^\d{4}$/;
const KEY_LENGTH = 64;

/** A transaction PIN must be exactly four digits. */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin);
}

/**
 * Hash a 4-digit PIN with scrypt (no native deps). Stored as `salt:derivedKey`,
 * both hex-encoded. A random per-PIN salt prevents identical PINs sharing a hash.
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(pin, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

/** Constant-time verification of a PIN against a stored `salt:derivedKey` hash. */
export function verifyPinHash(pin: string, stored: string): boolean {
  if (typeof stored !== 'string') return false;
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const derived = scryptSync(pin, salt, KEY_LENGTH);
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
