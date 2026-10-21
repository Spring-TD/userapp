import * as walletRepo from '../repositories/walletRepository';
import type { Wallet } from '../models/Wallet';
import { assertIntegerKobo } from './money';

export type WalletDeltaSuccess = {
  ok: true;
  balanceBefore: number;
  balanceAfter: number;
  wallet: Wallet;
};

export type WalletDeltaFailure = {
  ok: false;
  notFound?: boolean;
  insufficientFunds?: boolean;
};

/**
 * Atomically adjust wallet balances via MongoDB $inc (safe under concurrent credits/debits).
 */
export async function applyWalletDelta(
  walletId: string,
  mainDelta: number,
  ledgerDelta?: number
): Promise<WalletDeltaSuccess | WalletDeltaFailure> {
  assertIntegerKobo(mainDelta);
  const ledger = ledgerDelta ?? mainDelta;
  assertIntegerKobo(ledger);

  const result = await walletRepo.adjustWalletBalance(walletId, { mainDelta, ledgerDelta: ledger });
  if (!result) {
    return { ok: false, notFound: true };
  }
  if ('insufficientFunds' in result) {
    return { ok: false, insufficientFunds: true };
  }

  return {
    ok: true,
    balanceBefore: result.balanceBefore,
    balanceAfter: result.balanceAfter,
    wallet: result.wallet
  };
}
