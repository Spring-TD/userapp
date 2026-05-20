import axios from 'axios';
import { config } from '../config/environment';

/** Strip trailing slashes and mistaken `/api/...` suffixes so the internal URL is not doubled. */
function normalizeWalletServiceBase(raw: string): string {
  let s = raw.trim().replace(/\/+$/g, '');
  const suffixes = [
    '/api/v1/internal/wallets',
    '/api/v1/wallets',
    '/api/v1/internal',
    '/api/v1',
    '/api'
  ];
  for (;;) {
    let changed = false;
    for (const suf of suffixes) {
      if (s.length >= suf.length && s.slice(-suf.length).toLowerCase() === suf.toLowerCase()) {
        s = s.slice(0, -suf.length).replace(/\/+$/g, '');
        changed = true;
      }
    }
    if (!changed) break;
  }
  return s;
}

export type ProvisionedUserWallet = {
  id: string;
  merchantId: string;
  userId: string;
  currency?: string;
  virtualNuban?: {
    accountNumber?: string;
    provisionStatus?: string;
    provisionError?: string;
  };
};

/**
 * Provisions a user wallet on wallet-ms (including Payonus NUBAN when configured there).
 * Uses internal API — requires WALLET_SERVICE_URL + WALLET_INTERNAL_TOKEN on client-auth-ms
 * and matching WALLET_INTERNAL_TOKEN on wallet-ms.
 */
export async function provisionUserWalletAfterSignup(params: {
  userId: string;
  merchantId: string;
  displayName: string;
  /** Merchant owner's client-auth user id — compliance shareholders are keyed by this, not retail userId */
  complianceShareholderUserId?: string;
}): Promise<{ success: boolean; wallet?: ProvisionedUserWallet; error?: string }> {
  const base = normalizeWalletServiceBase(config.walletServiceUrl);
  const token = config.walletInternalToken.trim();
  if (!base || !token) {
    return { success: false, error: 'Wallet provisioning is not configured' };
  }

  const walletUrl = `${base}/api/v1/internal/wallets/user`;

  try {
    const response = await axios.post<{
      success?: boolean;
      data?: { wallet?: ProvisionedUserWallet };
      error?: string;
    }>(
      walletUrl,
      {
        userId: params.userId,
        merchantId: params.merchantId,
        name: `${params.displayName} Wallet`,
        currency: config.userWalletDefaultCurrency,
        ...(params.complianceShareholderUserId?.trim()
          ? { complianceShareholderUserId: params.complianceShareholderUserId.trim() }
          : {})
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: config.walletServiceHttpTimeoutMs
      }
    );

    if (!response.data?.success || !response.data.data?.wallet) {
      const payload = response.data as { error?: string; message?: string } | undefined;
      return {
        success: false,
        error: payload?.error || payload?.message || 'Wallet service returned an error'
      };
    }

    return { success: true, wallet: response.data.data.wallet };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const body = err.response?.data as { error?: string; path?: string } | undefined;
      const remote = body?.error || (body as { message?: string } | undefined)?.message || err.message;
      if (status === 404 && (remote === 'Route not found' || /not found/i.test(String(remote)))) {
        return {
          success: false,
          error: `Wallet route not found (404). Use WALLET_SERVICE_URL as wallet-ms origin only (no /api/v1 path), e.g. https://your-wallet-ms.fly.dev — attempted: ${walletUrl}`
        };
      }
      return { success: false, error: remote };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Wallet provisioning failed'
    };
  }
}
