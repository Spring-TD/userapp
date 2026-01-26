import { Wallet, Transaction } from '../models/Wallet';

/**
 * Shared mock database storage for wallet and transaction data
 * This ensures all services share the same in-memory data
 */
interface MockDB {
  wallets: Map<string, Wallet>;
  transactions: Map<string, Transaction>;
}

export const mockDB: MockDB = {
  wallets: new Map(),
  transactions: new Map()
};
