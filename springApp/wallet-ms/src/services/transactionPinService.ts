import TransactionPinModel from '../db/TransactionPinModel';
import { hashPin, isValidPinFormat, verifyPinHash } from '../utils/transactionPin';
import { logger } from '../utils/logger';

/** A 4-digit PIN has only 10k combinations, so cap incorrect attempts. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export type PinCheckCode =
  | 'OK'
  | 'TRANSACTION_PIN_REQUIRED' // user has no PIN yet -> prompt to create one
  | 'TRANSACTION_PIN_MISSING' // PIN exists but none supplied with the request
  | 'INVALID_TRANSACTION_PIN'
  | 'TRANSACTION_PIN_LOCKED';

export interface PinCheckResult {
  ok: boolean;
  code: PinCheckCode;
  status: number;
  message: string;
  attemptsRemaining?: number;
  lockedUntil?: Date | null;
}

export interface PinMutationResult {
  success: boolean;
  status: number;
  error?: string;
  code?: string;
}

export class TransactionPinService {
  /** Whether the user has set a transaction PIN. */
  static async hasPin(userId: string): Promise<boolean> {
    const doc = await TransactionPinModel.findOne({ userId }).select({ _id: 1 }).lean();
    return Boolean(doc);
  }

  /** PIN status for the storefront (used to prompt after KYC / before transfer). */
  static async getStatus(
    userId: string
  ): Promise<{ hasTransactionPin: boolean; locked: boolean; lockedUntil: Date | null }> {
    const doc = await TransactionPinModel.findOne({ userId }).lean();
    const lockedUntil = (doc?.lockedUntil as Date | null | undefined) ?? null;
    const locked = Boolean(lockedUntil && new Date(lockedUntil) > new Date());
    return { hasTransactionPin: Boolean(doc), locked, lockedUntil };
  }

  /** Create a PIN for a user who does not have one yet. */
  static async setPin(userId: string, pin: unknown): Promise<PinMutationResult> {
    if (!isValidPinFormat(pin)) {
      return { success: false, status: 400, error: 'Transaction PIN must be exactly 4 digits', code: 'INVALID_PIN_FORMAT' };
    }
    const existing = await TransactionPinModel.findOne({ userId }).select({ _id: 1 }).lean();
    if (existing) {
      return {
        success: false,
        status: 409,
        error: 'A transaction PIN is already set. Use change PIN instead.',
        code: 'TRANSACTION_PIN_EXISTS'
      };
    }
    await TransactionPinModel.create({ userId, pinHash: hashPin(pin), failedAttempts: 0, lockedUntil: null });
    logger.info('Transaction PIN created', { userId });
    return { success: true, status: 201 };
  }

  /** Change an existing PIN; requires the current PIN. */
  static async changePin(userId: string, currentPin: unknown, newPin: unknown): Promise<PinMutationResult> {
    if (!isValidPinFormat(newPin)) {
      return { success: false, status: 400, error: 'New transaction PIN must be exactly 4 digits', code: 'INVALID_PIN_FORMAT' };
    }
    const doc = await TransactionPinModel.findOne({ userId });
    if (!doc) {
      return {
        success: false,
        status: 409,
        error: 'No transaction PIN set. Create one first.',
        code: 'TRANSACTION_PIN_REQUIRED'
      };
    }
    if (doc.lockedUntil && doc.lockedUntil > new Date()) {
      return {
        success: false,
        status: 423,
        error: 'Transaction PIN is temporarily locked. Try again later.',
        code: 'TRANSACTION_PIN_LOCKED'
      };
    }
    if (!isValidPinFormat(currentPin) || !verifyPinHash(currentPin, doc.pinHash)) {
      return { success: false, status: 401, error: 'Current transaction PIN is incorrect', code: 'INVALID_TRANSACTION_PIN' };
    }
    doc.pinHash = hashPin(newPin);
    doc.failedAttempts = 0;
    doc.lockedUntil = null;
    await doc.save();
    logger.info('Transaction PIN changed', { userId });
    return { success: true, status: 200 };
  }

  /**
   * Verify a PIN as a precondition for moving money out of a wallet.
   * Tracks failed attempts and locks the PIN after too many failures.
   */
  static async verifyForTransfer(userId: string, pin?: unknown): Promise<PinCheckResult> {
    const doc = await TransactionPinModel.findOne({ userId });

    // No PIN set: signal the storefront to prompt the user to create one.
    if (!doc) {
      return {
        ok: false,
        code: 'TRANSACTION_PIN_REQUIRED',
        status: 409,
        message: 'Set a 4-digit transaction PIN to transfer funds.'
      };
    }

    if (doc.lockedUntil && doc.lockedUntil > new Date()) {
      return {
        ok: false,
        code: 'TRANSACTION_PIN_LOCKED',
        status: 423,
        message: 'Transaction PIN locked due to too many incorrect attempts. Try again later.',
        lockedUntil: doc.lockedUntil
      };
    }

    if (typeof pin !== 'string' || pin.length === 0) {
      return {
        ok: false,
        code: 'TRANSACTION_PIN_MISSING',
        status: 400,
        message: 'Transaction PIN is required to transfer funds.'
      };
    }

    if (!isValidPinFormat(pin) || !verifyPinHash(pin, doc.pinHash)) {
      doc.failedAttempts = (doc.failedAttempts || 0) + 1;
      let lockedUntil: Date | null = null;
      if (doc.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        doc.lockedUntil = lockedUntil;
        doc.failedAttempts = 0;
      }
      await doc.save();
      logger.warn('Incorrect transaction PIN attempt', { userId, locked: Boolean(lockedUntil) });
      if (lockedUntil) {
        return {
          ok: false,
          code: 'TRANSACTION_PIN_LOCKED',
          status: 423,
          message: 'Transaction PIN locked due to too many incorrect attempts. Try again later.',
          lockedUntil
        };
      }
      return {
        ok: false,
        code: 'INVALID_TRANSACTION_PIN',
        status: 401,
        message: 'Incorrect transaction PIN.',
        attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - doc.failedAttempts)
      };
    }

    // Correct PIN: clear any prior failure state.
    if (doc.failedAttempts || doc.lockedUntil) {
      doc.failedAttempts = 0;
      doc.lockedUntil = null;
      await doc.save();
    }
    return { ok: true, code: 'OK', status: 200, message: 'OK' };
  }
}
