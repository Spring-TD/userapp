import { EventEmitter } from 'events';
import type { Transaction } from '../models/Wallet';

/**
 * Lightweight in-process event bus that decouples the DB layer (which records the
 * canonical wallet ledger) from higher-level side effects (merchant Transactions
 * tab mirroring, notifications, receipt generation).
 *
 * `db.createTransaction` emits `transaction.created`; subscribers registered at
 * startup handle it best-effort so ledger writes never block on side effects.
 */
export const transactionEvents = new EventEmitter();

export const TRANSACTION_CREATED = 'transaction.created';

export function emitTransactionCreated(transaction: Transaction): void {
  // setImmediate keeps the ledger write hot-path free of subscriber work.
  setImmediate(() => {
    transactionEvents.emit(TRANSACTION_CREATED, transaction);
  });
}
