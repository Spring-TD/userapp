/**
 * Merchant API-key wallet reads (details + history) via account-ms gateway.
 */

function pathnameOf(path: string): string {
  return path.split('?')[0] || '';
}

const MERCHANT_WALLETS_ALL = /^\/api\/v1\/wallets\/merchant\/[^/]+\/all\/?$/;
const MERCHANT_WALLET_BY_TYPE = /^\/api\/v1\/wallets\/merchant\/[^/]+\/type\/[^/]+\/?$/;
const MERCHANT_WALLET_HISTORY =
  /^\/api\/v1\/wallets\/(?:treasury|billing|operation|repayment|settlement|kyc)\/[^/]+\/transactions\/?$/;
const USER_WALLET_TRANSACTIONS = /^\/api\/v1\/wallets\/user\/[^/]+\/transactions\/?$/;
const USER_WALLET = /^\/api\/v1\/wallets\/user\/[^/]+\/?$/;

export function isMerchantWalletReadRoute(path: string, method: string): boolean {
  if (method !== 'GET') return false;
  const pathname = pathnameOf(path);
  return (
    MERCHANT_WALLETS_ALL.test(pathname) ||
    MERCHANT_WALLET_BY_TYPE.test(pathname) ||
    MERCHANT_WALLET_HISTORY.test(pathname)
  );
}

export function isUserWalletReadRoute(path: string, method: string): boolean {
  if (method !== 'GET') return false;
  const pathname = pathnameOf(path);
  if (USER_WALLET_TRANSACTIONS.test(pathname)) return true;
  // Exact user wallet only — not /balance, /transfer, /api-call
  if (/\/user\/[^/]+\/[^/]+/.test(pathname)) return false;
  return USER_WALLET.test(pathname);
}

export function isWalletReadRoute(path: string, method: string): boolean {
  return isMerchantWalletReadRoute(path, method) || isUserWalletReadRoute(path, method);
}
