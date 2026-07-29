import axios from 'axios';

export type SettlementCollectRequest = {
  merchantId: string;
  appId?: string;
  userId?: string;
  amount: number;
  referenceId: string;
  source: string;
  category: string;
  description?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  debitUserWallet?: boolean;
};

export type SettlementCollectResult = {
  success: boolean;
  duplicate?: boolean;
  skipped?: boolean;
  error?: string;
};

function normalizeWalletBase(raw: string): string {
  let value = raw.trim().replace(/\/+$/g, '');
  const suffixes = ['/api/v1/internal/wallets', '/api/v1/wallets', '/api/v1/internal', '/api/v1', '/api'];
  for (;;) {
    let changed = false;
    for (const suffix of suffixes) {
      if (value.toLowerCase().endsWith(suffix.toLowerCase())) {
        value = value.slice(0, -suffix.length).replace(/\/+$/g, '');
        changed = true;
      }
    }
    if (!changed) break;
  }
  return value;
}

export async function collectToSettlementWallet(
  request: SettlementCollectRequest
): Promise<SettlementCollectResult> {
  const walletBase = normalizeWalletBase(process.env.WALLET_SERVICE_URL || 'http://localhost:4004');
  const token = (process.env.JWT_SECRET || process.env.WALLET_INTERNAL_TOKEN || '').trim();
  if (!token) return { success: false, skipped: true, error: 'JWT_SECRET not configured' };
  if (!request.amount || request.amount <= 0) return { success: true, skipped: true };

  const response = await axios.post(
    // Primary route (formerly "/settlement/collect", still available as a legacy alias on wallet-ms)
    `${walletBase}/api/v1/internal/wallets/repayment/collect`,
    request,
    {
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  const body = response.data as { success?: boolean; duplicate?: boolean; error?: string };
  if (response.status >= 200 && response.status < 300 && body.success) {
    return { success: true, duplicate: body.duplicate === true };
  }
  return { success: false, error: body.error || `Repayment collect failed (${response.status})` };
}
