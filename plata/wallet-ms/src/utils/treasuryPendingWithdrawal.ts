import { TransactionStatus, TransactionType } from '../models/Wallet';

const SAVINGS_WITHDRAWAL_CATEGORIES = new Set([
  'SAVINGS_WITHDRAWAL',
  'SAVINGS_PAYOUT',
  'SAVINGS_EARLY_WITHDRAWAL',
  'SAVINGS_WITHDRAWAL_REQUEST'
]);

function metaString(meta: Record<string, unknown> | undefined, key: string): string {
  const v = meta?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

export function isTreasuryPendingWithdrawalInput(input: {
  type: TransactionType | string;
  status?: TransactionStatus | string;
  amount: number;
  category?: string;
  metadata?: Record<string, unknown>;
}): boolean {
  if (String(input.type).toUpperCase() !== TransactionType.DEBIT) return false;
  const status = input.status ?? TransactionStatus.PENDING;
  if (String(status).toUpperCase() !== TransactionStatus.PENDING) return false;
  if (!(Number(input.amount) > 0)) return false;

  const appId = metaString(input.metadata, 'appId');
  if (!appId) return false;

  const category = (input.category || '').trim();
  if (SAVINGS_WITHDRAWAL_CATEGORIES.has(category)) return true;
  if (
    category === 'COMMODITY_LIQUIDATION_REQUEST' ||
    category === 'COMMODITY_WITHDRAWAL' ||
    category === 'INVESTMENT_LIQUIDATION_REQUEST' ||
    category === 'SAVINGS_MATURITY_PAYOUT'
  ) {
    return true;
  }

  const productType = metaString(input.metadata, 'productType').toUpperCase();
  const withdrawalRequest = input.metadata?.withdrawalRequest === true;
  const liquidationRequest = input.metadata?.liquidationRequest === true;
  const maturityPayout = input.metadata?.maturityPayout === true;
  if (productType === 'SAVINGS' && (withdrawalRequest || maturityPayout)) return true;
  if (productType === 'COMMODITY' && (liquidationRequest || maturityPayout)) return true;
  if (productType === 'INVESTMENT' && (liquidationRequest || maturityPayout)) return true;
  return false;
}
