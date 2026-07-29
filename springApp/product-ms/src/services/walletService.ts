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

export interface ProductWalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: string;
  description: string;
  referenceId?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  metadata?: Record<string, unknown>;
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
  private walletBase(): string {
    const base = normalizeWalletServiceBase(config.walletServiceUrl);
    const token = config.walletInternalToken || config.jwtSecret;
    if (!base || !token) {
      throw new Error('Wallet product provisioning is not configured');
    }
    return base;
  }

  private internalToken(): string {
    return (config.walletInternalToken || config.jwtSecret || '').trim();
  }

  async ensureProductWallet(input: EnsureProductWalletInput): Promise<{
    wallet: ProductWallet;
    reusedUpstreamAccount?: boolean;
    skipped?: boolean;
  }> {
    const base = this.walletBase();

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
          'X-Internal-Token': this.internalToken()
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

  async applyProductApplicationApproval(input: {
    userId: string;
    applicationId: string;
    merchantId: string;
    productId: string;
    productName?: string;
    productType: string;
    appId?: string;
    amount: number;
    currency: string;
    referenceId: string;
    description?: string;
    metadata?: Record<string, unknown>;
    upstreamAccount?: {
      accountNumber?: string;
      bankName?: string;
      bankCode?: string;
      providerReference?: string;
      accountType?: 'static' | 'reserved' | 'dynamic';
      provisionStatus?: 'active' | 'failed';
      provisionError?: string;
      provisionedAt?: string;
    };
  }): Promise<{
    wallet: ProductWallet;
    transaction?: ProductWalletTransaction;
    duplicate?: boolean;
  }> {
    const base = this.walletBase();
    const response = await axios.post<{
      success?: boolean;
      duplicate?: boolean;
      data?: { wallet?: ProductWallet; transaction?: ProductWalletTransaction };
      error?: string;
      message?: string;
    }>(
      `${base}/api/v1/internal/wallets/product-application/approval`,
      input,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': this.internalToken()
        },
        timeout: config.walletServiceHttpTimeoutMs
      }
    );

    if (!response.data?.success || !response.data.data?.wallet) {
      throw new Error(response.data?.error || response.data?.message || 'Wallet service returned an error');
    }

    return {
      wallet: response.data.data.wallet,
      transaction: response.data.data.transaction,
      duplicate: response.data.duplicate
    };
  }
}

export default new WalletService();
