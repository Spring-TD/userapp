import type { Transaction, Wallet } from '../models/Wallet';
import { koboToNaira } from './money';

/**
 * Present wallet balances in Naira for HTTP/storefront clients.
 * In-memory / Mongo domain values remain integer kobo.
 */
export function walletForApi<T extends Wallet>(wallet: T): T {
  return {
    ...wallet,
    balance: koboToNaira(wallet.mainBalance),
    mainBalance: koboToNaira(wallet.mainBalance),
    ledgerBalance: koboToNaira(wallet.ledgerBalance)
  };
}

export function walletsForApi<T extends Wallet>(wallets: T[]): T[] {
  return wallets.map((w) => walletForApi(w));
}

export function transactionForApi<T extends Transaction>(tx: T): T {
  const unit = (tx as T & { amountUnit?: string }).amountUnit;
  // Legacy txs without amountUnit are Naira major units — do not rescale.
  if (unit !== 'kobo') return tx;
  return {
    ...tx,
    amount: koboToNaira(tx.amount),
    ...(tx.balanceBefore !== undefined ? { balanceBefore: koboToNaira(tx.balanceBefore) } : {}),
    ...(tx.balanceAfter !== undefined ? { balanceAfter: koboToNaira(tx.balanceAfter) } : {})
  };
}

export function transactionsForApi<T extends Transaction>(txs: T[]): T[] {
  return txs.map((t) => transactionForApi(t));
}
