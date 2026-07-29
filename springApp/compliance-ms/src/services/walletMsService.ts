import axios from 'axios';
import {
  isWalletMsInternalConfigured,
  walletMsInternalHeaders,
  walletMsRequestTimeoutMs,
  walletServiceUrl
} from '../utils/walletMsClient';

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
  if (!isWalletMsInternalConfigured()) {
    return {
      success: false,
      error: 'Wallet service internal API is not configured (WALLET_SERVICE_URL, JWT_SECRET)'
    };
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
        headers: walletMsInternalHeaders(),
        timeout: walletMsRequestTimeoutMs(90000)
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
