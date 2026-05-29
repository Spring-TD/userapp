import axios from 'axios';
import { config } from '../config/environment';

function normalizeWalletServiceBase(raw: string): string {
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

export interface ProductWallet {
  id: string;
  userId: string;
  merchantId: string;
  walletPurpose?: string;
  productApplicationId?: string;
  productId?: string;
  productType?: string;
  appId?: string;
  currency?: string;
  virtualNuban?: {
    accountNumber?: string;
    bankName?: string;
    bankCode?: string;
    providerReference?: string;
    provisionStatus?: string;
    provisionError?: string;
    provisionedAt?: string;
  };
}

export interface EnsureProductWalletInput {
  userId: string;
  merchantId: string;
  applicationId: string;
  productId: string;
  productName: string;
  productType: string;
  appId: string;
  currency: string;
}

class WalletService {
  async ensureProductWallet(input: EnsureProductWalletInput): Promise<{
    wallet: ProductWallet;
    reusedUpstreamAccount?: boolean;
    skipped?: boolean;
  }> {
    const base = normalizeWalletServiceBase(config.walletServiceUrl);
    if (!base || !config.walletInternalToken) {
      throw new Error('Wallet product provisioning is not configured');
    }

    const response = await axios.post<{
      success?: boolean;
      skipped?: boolean;
      reusedUpstreamAccount?: boolean;
      data?: { wallet?: ProductWallet };
      error?: string;
      message?: string;
    }>(
      `${base}/api/v1/internal/wallets/product-application`,
      input,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': config.walletInternalToken
        },
        timeout: config.walletServiceHttpTimeoutMs
      }
    );

    if (!response.data?.success || !response.data.data?.wallet) {
      throw new Error(response.data?.error || response.data?.message || 'Wallet service returned an error');
    }

    return {
      wallet: response.data.data.wallet,
      skipped: response.data.skipped,
      reusedUpstreamAccount: response.data.reusedUpstreamAccount
    };
  }
}

export default new WalletService();
