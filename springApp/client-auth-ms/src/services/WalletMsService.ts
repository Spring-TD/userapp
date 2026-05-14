import axios from 'axios';
import { config } from '../config/environment';

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
}): Promise<{ success: boolean; wallet?: ProvisionedUserWallet; error?: string }> {
  const base = config.walletServiceUrl.trim();
  const token = config.walletInternalToken.trim();
  if (!base || !token) {
    return { success: false, error: 'Wallet provisioning is not configured' };
  }

  try {
    const response = await axios.post<{
      success?: boolean;
      data?: { wallet?: ProvisionedUserWallet };
      error?: string;
    }>(
      `${base.replace(/\/$/, '')}/api/v1/internal/wallets/user`,
      {
        userId: params.userId,
        merchantId: params.merchantId,
        name: `${params.displayName} Wallet`,
        currency: config.userWalletDefaultCurrency
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
      return {
        success: false,
        error: response.data?.error || 'Wallet service returned an error'
      };
    }

    return { success: true, wallet: response.data.data.wallet };
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? (err.response?.data as { error?: string })?.error || err.message
      : err instanceof Error
        ? err.message
        : 'Wallet provisioning failed';
    return { success: false, error: message };
  }
}
