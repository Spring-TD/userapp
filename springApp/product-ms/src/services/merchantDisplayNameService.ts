import axios from 'axios';
import { config } from '../config/environment';
import type { Product } from '../types/product';
import createAppService from './createAppService';

type MerchantOwnerData = {
  userId?: string;
  firstName?: string;
  lastName?: string;
};

type MerchantOwnerResponse = {
  success?: boolean;
  data?: MerchantOwnerData;
};

type BusinessInfoResponse = {
  success?: boolean;
  data?: {
    companyName?: string;
  };
};

type UpstreamCatalogProduct = Product & {
  merchant?: {
    id?: string;
    name?: string | null;
    companyName?: string | null;
  };
};

export type ProductCreatorDisplay = {
  merchantName?: string;
  poweredBy?: string;
};

class MerchantDisplayNameService {
  async resolveOfferingMerchantName(input: {
    merchantId?: string;
    appId?: string;
    fallback?: string;
  }): Promise<string | undefined> {
    const merchantId = input.merchantId?.trim();
    const appId = input.appId?.trim();

    if (merchantId) {
      const businessName = await this.resolveTenantMerchantBusinessName(merchantId);
      if (businessName) {
        return businessName;
      }
    }

    if (appId) {
      const app = await createAppService.getAppInfo(appId);
      const appName = app?.name?.trim();
      if (appName) {
        return appName;
      }
    }

    const fallback = input.fallback?.trim();
    return fallback || undefined;
  }

  async resolveProductCreatorDisplay(product?: Product): Promise<ProductCreatorDisplay> {
    if (!product) {
      return {};
    }

    const upstreamProductId = product.upstreamProductId?.trim();
    const upstreamCatalog = upstreamProductId
      ? await this.fetchUpstreamCatalogProduct(upstreamProductId)
      : null;
    const merchantMeta = upstreamCatalog?.merchant ?? product.merchant;
    const merchantId = merchantMeta?.id?.trim();

    let poweredBy = this.normalizeDisplayName(merchantMeta?.companyName);
    let merchantName = this.normalizePersonalName(merchantMeta?.name);

    if (merchantId) {
      const owner = await this.resolvePlataMerchantOwner(merchantId);
      if (!merchantName && owner) {
        merchantName = this.normalizePersonalName(
          `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
        );
      }
      const ownerUserId = owner?.userId?.trim();
      if (!poweredBy && ownerUserId) {
        poweredBy = await this.resolvePlataBusinessCompanyName(ownerUserId);
      }
    }

    if (!poweredBy) {
      poweredBy = config.plataIntegratorMerchantName || undefined;
    }

    return {
      merchantName,
      poweredBy
    };
  }

  private normalizeDisplayName(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
  }

  private normalizePersonalName(value?: string | null): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed || this.looksLikeMerchantId(trimmed)) {
      return undefined;
    }
    return trimmed;
  }

  private looksLikeMerchantId(value: string): boolean {
    return /^merchant_[a-z0-9_]+$/i.test(value);
  }

  private plataServiceInternalTokens(): string[] {
    const tokens = [
      config.plataClientAuthInternalToken,
      config.complianceWalletInternalToken,
      config.clientAuthInternalToken
    ]
      .map((token) => token?.trim())
      .filter((token): token is string => Boolean(token));
    return [...new Set(tokens)];
  }

  private getPlataAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (config.plataPublicKey) {
      headers.PLATA_PUBLIC_KEY = config.plataPublicKey;
    }
    if (config.plataSecretKey) {
      headers.PLATA_SECRET_KEY = config.plataSecretKey;
    }
    return headers;
  }

  private async fetchUpstreamCatalogProduct(globalProductId: string): Promise<UpstreamCatalogProduct | null> {
    const base = config.plataAccountServiceUrl.trim();
    if (!base) {
      return null;
    }

    try {
      const response = await axios.get<{ success?: boolean; data?: UpstreamCatalogProduct[] }>(
        `${base}/api/v1/products`,
        {
          headers: this.getPlataAuthHeaders(),
          timeout: config.walletServiceHttpTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && Array.isArray(response.data?.data)) {
        return (
          response.data.data.find(
            (product) => product.id === globalProductId || product.referenceNumber === globalProductId
          ) ?? null
        );
      }
    } catch (error) {
      console.warn('upstream catalog lookup failed for product creator display', {
        globalProductId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return null;
  }

  private async resolvePlataMerchantOwner(merchantId: string): Promise<MerchantOwnerData | undefined> {
    const base = config.plataClientAuthServiceUrl.trim();
    const tokens = this.plataServiceInternalTokens();
    if (!base || tokens.length === 0) {
      return undefined;
    }

    for (const token of tokens) {
      try {
        const response = await axios.get<MerchantOwnerResponse>(
          `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(merchantId)}`,
          {
            headers: { 'X-Internal-Token': token },
            timeout: config.clientAuthUserTimeoutMs,
            validateStatus: () => true
          }
        );

        if (response.status >= 200 && response.status < 300 && response.data?.success && response.data.data) {
          return response.data.data;
        }
      } catch (error) {
        console.warn('plata merchant owner lookup failed', {
          merchantId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return undefined;
  }

  private async resolvePlataBusinessCompanyName(userId: string): Promise<string | undefined> {
    const base = config.plataComplianceServiceUrl.trim();
    const tokens = this.plataServiceInternalTokens();
    if (!base || tokens.length === 0) {
      return undefined;
    }

    for (const token of tokens) {
      try {
        const response = await axios.get<BusinessInfoResponse>(
          `${base.replace(/\/+$/, '')}/api/v1/kyc/internal/business-info/${encodeURIComponent(userId)}`,
          {
            headers: { 'X-Internal-Token': token },
            timeout: config.complianceBvnTimeoutMs,
            validateStatus: () => true
          }
        );

        if (response.status >= 200 && response.status < 300 && response.data?.success) {
          const companyName = response.data.data?.companyName?.trim();
          if (companyName) {
            return companyName;
          }
        }
      } catch (error) {
        console.warn('plata business-info lookup failed', {
          userId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return undefined;
  }

  private async resolveTenantMerchantBusinessName(merchantId: string): Promise<string | undefined> {
    const ownerUserId = await this.resolveMerchantOwnerUserId(merchantId);
    if (!ownerUserId) {
      return undefined;
    }
    return this.resolveBusinessCompanyName(ownerUserId);
  }

  private async resolveMerchantOwnerUserId(merchantId: string): Promise<string | undefined> {
    const base = config.clientAuthServiceUrl.trim();
    const token = config.clientAuthInternalToken;
    if (!base || !token) {
      return undefined;
    }

    try {
      const response = await axios.get<MerchantOwnerResponse>(
        `${base}/api/v1/user/internal/merchant-owner/${encodeURIComponent(merchantId)}`,
        {
          headers: { 'X-Internal-Token': token },
          timeout: config.clientAuthUserTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success) {
        const userId = response.data.data?.userId?.trim();
        return userId || undefined;
      }
    } catch (error) {
      console.warn('client-auth merchant owner lookup failed', {
        merchantId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }

  private async resolveBusinessCompanyName(userId: string): Promise<string | undefined> {
    const base = config.complianceServiceUrl.trim();
    const token = config.complianceWalletInternalToken;
    if (!base || !token) {
      return undefined;
    }

    try {
      const response = await axios.get<BusinessInfoResponse>(
        `${base.replace(/\/+$/, '')}/api/v1/kyc/internal/business-info/${encodeURIComponent(userId)}`,
        {
          headers: { 'X-Internal-Token': token },
          timeout: config.complianceBvnTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success) {
        const companyName = response.data.data?.companyName?.trim();
        return companyName || undefined;
      }
    } catch (error) {
      console.warn('compliance business-info lookup failed', {
        userId,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    return undefined;
  }
}

export default new MerchantDisplayNameService();
