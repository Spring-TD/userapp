import axios from 'axios';

function normalizeWalletServiceBase(raw: string): string {
  let s = raw.trim().replace(/\/+$/g, '');
  const suffixes = ['/api/v1/internal/wallets', '/api/v1/wallets', '/api/v1/internal', '/api/v1', '/api'];
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

function walletServiceUrl(): string {
  return normalizeWalletServiceBase(
    process.env.WALLET_SERVICE_URL || process.env.WALLET_MS_URL || 'http://localhost:4004'
  );
}

function walletInternalToken(): string {
  return (process.env.WALLET_INTERNAL_TOKEN || '').trim();
}

export type ProvisionUserNubanResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
  wallet?: unknown;
};

/**
 * After Fuspay modular KYC completes, provision PayOnUs fixed VA on the user's wallet.
 */
export async function provisionUserNubanAfterKyc(userId: string): Promise<ProvisionUserNubanResult> {
  const base = walletServiceUrl();
  const token = walletInternalToken();
  if (!base || !token) {
    return { success: false, error: 'Wallet service internal API is not configured (WALLET_SERVICE_URL, WALLET_INTERNAL_TOKEN)' };
  }

  const url = `${base}/api/v1/internal/wallets/user/${encodeURIComponent(userId)}/provision-nuban`;

  try {
    const response = await axios.post<{
      success?: boolean;
      skipped?: boolean;
      error?: string;
      data?: { wallet?: unknown };
    }>(
      url,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': token
        },
        timeout: Math.max(10000, parseInt(process.env.WALLET_SERVICE_HTTP_TIMEOUT_MS || '90000', 10))
      }
    );

    const body = response.data;
    if (response.status >= 200 && response.status < 300 && body?.success) {
      return {
        success: true,
        skipped: body.skipped,
        wallet: body.data?.wallet
      };
    }

    return {
      success: false,
      error: body?.error || 'Wallet NUBAN provisioning failed',
      wallet: body?.data?.wallet
    };
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { error?: string } }; message?: string };
    const remote = ax.response?.data?.error || ax.message || 'Wallet service unreachable';
    return { success: false, error: remote };
  }
}
