import axios from 'axios';
import { config } from '../config/environment';
import type { Product } from '../types/product';
import type {
  SubmitUpstreamExternalApplicationInput,
  SubmitUpstreamExternalApplicationResult,
  UpstreamExternalPerson
} from '../types/upstreamApplication';

type UpstreamCatalogProduct = Product & {
  merchant?: {
    id?: string;
    name?: string | null;
    companyName?: string | null;
  };
  calculatedConfig?: Record<string, unknown>;
};

/** POST /api/v1/products/external-applications (via account-ms gateway only). */
type UpstreamExternalApplicationBody = {
  appId: string;
  productId: string;
  merchantId: string;
  merchantName: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  productName?: string;
  currency?: string;
  country?: string;
  productCreatorMerchantName?: string;
  subMerchant?: UpstreamExternalPerson;
  externalUser: UpstreamExternalPerson & { bvn: string };
  application: {
    contractSnapshot: Record<string, unknown>;
    payoutSplit?: Record<string, unknown>;
    merchantProductId?: string;
    status?: string;
  };
};

type UpstreamExternalApplicationResponse = {
  success?: boolean;
  data?: {
    application?: { id?: string; [key: string]: unknown };
    applicationCreated?: boolean;
    [key: string]: unknown;
  };
  error?: string;
  [key: string]: unknown;
};

type UpstreamAccountDetails = NonNullable<SubmitUpstreamExternalApplicationResult['upstreamAccount']>;

export class UpstreamApplicationService {
  isConfigured(): boolean {
    return Boolean(config.plataPublicKey && config.plataSecretKey && config.plataAccountServiceUrl);
  }

  /** Upstream auth: PLATA keys only, never Authorization / Bearer. */
  private getUpstreamAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (config.plataPublicKey) headers.PLATA_PUBLIC_KEY = config.plataPublicKey;
    if (config.plataSecretKey) headers.PLATA_SECRET_KEY = config.plataSecretKey;
    return headers;
  }

  private logError(context: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      console.error(context, error.response?.status, error.response?.data ?? error.message);
    } else {
      console.error(context, error);
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private firstStringFrom(record: Record<string, unknown> | null, keys: string[]): string | undefined {
    if (!record) {
      return undefined;
    }
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return undefined;
  }

  private accountFromRecord(record: Record<string, unknown> | null): UpstreamAccountDetails | null {
    if (!record) {
      return null;
    }

    const accountNumber = this.firstStringFrom(record, [
      'accountNumber',
      'account_number',
      'nuban',
      'virtualAccountNumber',
      'virtual_account_number'
    ]);
    const provisionStatus = this.firstStringFrom(record, ['provisionStatus', 'provision_status', 'status']);
    const provisionError = this.firstStringFrom(record, ['provisionError', 'provision_error', 'error']);

    if (!accountNumber && !provisionStatus && !provisionError) {
      return null;
    }

    return {
      accountNumber,
      bankName: this.firstStringFrom(record, ['bankName', 'bank_name', 'bank']),
      bankCode: this.firstStringFrom(record, ['bankCode', 'bank_code']),
      providerReference: this.firstStringFrom(record, [
        'providerReference',
        'provider_reference',
        'reference',
        'id',
        'walletId',
        'wallet_id'
      ]),
      provisionStatus: provisionStatus ?? (accountNumber ? 'active' : undefined),
      provisionError
    };
  }

  private extractUpstreamAccount(response: UpstreamExternalApplicationResponse): UpstreamAccountDetails | undefined {
    const root = this.asRecord(response);
    const data = this.asRecord(response.data);
    const application = this.asRecord(data?.application);

    const candidates: Array<Record<string, unknown> | null> = [
      this.asRecord(data?.upstreamAccount),
      this.asRecord(data?.account),
      this.asRecord(data?.bankAccount),
      this.asRecord(data?.virtualNuban),
      this.asRecord(data?.virtualAccount),
      this.asRecord(data?.wallet),
      this.asRecord(this.asRecord(data?.wallet)?.virtualNuban),
      this.asRecord(this.asRecord(data?.wallet)?.virtualAccount),
      this.asRecord(data?.productWallet),
      this.asRecord(this.asRecord(data?.productWallet)?.upstreamAccount),
      this.asRecord(application?.upstreamAccount),
      this.asRecord(application?.account),
      this.asRecord(application?.bankAccount),
      this.asRecord(application?.virtualNuban),
      this.asRecord(application?.virtualAccount),
      this.asRecord(application?.wallet),
      this.asRecord(this.asRecord(application?.wallet)?.virtualNuban),
      this.asRecord(this.asRecord(application?.wallet)?.virtualAccount),
      this.asRecord(application?.productWallet),
      this.asRecord(this.asRecord(application?.productWallet)?.upstreamAccount),
      this.asRecord(root?.upstreamAccount),
      this.asRecord(root?.account),
      this.asRecord(root?.virtualNuban),
      this.asRecord(root?.virtualAccount)
    ];

    for (const candidate of candidates) {
      const account = this.accountFromRecord(candidate);
      if (account) {
        return account;
      }
    }

    return undefined;
  }

  private async fetchUpstreamCatalogProduct(globalProductId: string): Promise<UpstreamCatalogProduct | null> {
    try {
      const response = await axios.get<{ success?: boolean; data?: UpstreamCatalogProduct }>(
        `${config.plataAccountServiceUrl}/api/v1/products/${globalProductId}`,
        {
          headers: this.getUpstreamAuthHeaders(),
          timeout: config.walletServiceHttpTimeoutMs,
          validateStatus: () => true
        }
      );
      if (response.status !== 200 || !response.data?.data) {
        return null;
      }
      return response.data.data;
    } catch (error) {
      this.logError('Error fetching upstream catalog product:', error);
      return null;
    }
  }

  private resolveGlobalProductId(product: Product): string {
    const globalId = (product.upstreamProductId || '').trim();
    if (!globalId) {
      throw new Error(
        'Product has no upstreamProductId; activate the product from the Plata catalog before applying'
      );
    }
    return globalId;
  }

  private resolvePlataAppId(product: Product, upstreamCatalog: UpstreamCatalogProduct | null): string {
    const plataAppId = (upstreamCatalog?.appId ?? product.upstreamAppId ?? '').trim();
    if (!plataAppId) {
      throw new Error('Could not resolve Plata appId for upstream external-applications');
    }
    return plataAppId;
  }

  private buildContractSnapshot(
    input: SubmitUpstreamExternalApplicationInput,
    product: Product,
    globalProductId: string,
    upstreamCatalog: UpstreamCatalogProduct | null
  ): Record<string, unknown> {
    const source = upstreamCatalog ?? product;
    return {
      globalProductId,
      globalProductReferenceNumber: source.referenceNumber ?? product.referenceNumber,
      localApplicationId: input.localApplicationId,
      localAppId: input.localAppId,
      productName: product.name,
      productType: product.type,
      principal: input.amount,
      amount: input.amount,
      currency: input.currency,
      structure: source.structure ?? product.structure,
      about: source.about ?? product.about,
      requirements: product.requirements,
      feesAndCharges: source.feesAndCharges ?? product.feesAndCharges,
      calculatedConfig: upstreamCatalog?.calculatedConfig,
      requirementSubmissions: input.requirementSubmissions
    };
  }

  /**
   * Spring/springApp is the Plata integrator (body.merchantId). Tenant merchants are never used here.
   */
  private resolveIntegratorMerchant(input: SubmitUpstreamExternalApplicationInput): {
    merchantId: string;
    merchantName: string;
  } | null {
    const merchantId = (config.plataIntegratorMerchantId || input.integratorMerchantId || '').trim();
    if (!merchantId) {
      return null;
    }
    const merchantName =
      config.plataIntegratorMerchantName?.trim() ||
      input.integratorMerchantName?.trim() ||
      'Spring';
    return { merchantId, merchantName };
  }

  /**
   * Spring tenants are sub-merchants on Plata: offeringMerchantId + optional subMerchant usage event.
   */
  private resolveSubMerchant(
    input: SubmitUpstreamExternalApplicationInput,
    integratorMerchantId: string
  ): UpstreamExternalPerson | undefined {
    if (input.subMerchant) {
      return input.subMerchant;
    }

    const offeringId = input.offeringMerchantId.trim();
    if (!offeringId || offeringId === integratorMerchantId) {
      return undefined;
    }

    const email = input.subMerchantContactEmail?.trim();
    const phone = input.subMerchantContactPhone?.trim();
    if (!email || !phone) {
      return undefined;
    }

    return {
      id: offeringId,
      name: input.offeringMerchantName?.trim() || offeringId,
      email,
      phone
    };
  }

  async submitExternalApplication(
    input: SubmitUpstreamExternalApplicationInput
  ): Promise<SubmitUpstreamExternalApplicationResult> {
    if (!this.isConfigured()) {
      return { skipped: true, skipReason: 'Plata upstream keys not configured' };
    }

    const phone = input.phone?.trim();
    const bvn = input.bvn?.trim();
    const email = input.email?.trim();
    const name = input.applicantName?.trim();

    if (!email) {
      return { skipped: true, skipReason: 'email is required to sync application to Plata upstream' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { skipped: true, skipReason: 'email must be valid for upstream sync' };
    }
    if (!name) {
      return { skipped: true, skipReason: 'applicantName is required to sync application to Plata upstream' };
    }
    if (!phone) {
      return { skipped: true, skipReason: 'phone is required to sync application to Plata upstream' };
    }
    if (!bvn) {
      return { skipped: true, skipReason: 'bvn is required to sync application to Plata upstream' };
    }
    if (!/^\d{11}$/.test(bvn)) {
      return { skipped: true, skipReason: 'bvn must be exactly 11 digits for upstream sync' };
    }

    const globalProductId = this.resolveGlobalProductId(input.product);
    const upstreamCatalog = await this.fetchUpstreamCatalogProduct(globalProductId);
    const plataAppId = this.resolvePlataAppId(input.product, upstreamCatalog);
    const integrator = this.resolveIntegratorMerchant(input);
    if (!integrator) {
      return {
        skipped: true,
        skipReason:
          'Set PLATA_INTEGRATOR_MERCHANT_ID (Spring merchant on Plata) or pass integratorMerchantId on the apply body'
      };
    }

    const subMerchant = this.resolveSubMerchant(input, integrator.merchantId);

    const productCreatorMerchantName =
      input.productCreatorMerchantName?.trim() ||
      upstreamCatalog?.merchant?.companyName?.trim() ||
      upstreamCatalog?.merchant?.name?.trim() ||
      undefined;

    const body: UpstreamExternalApplicationBody = {
      appId: plataAppId,
      productId: globalProductId,
      merchantId: integrator.merchantId,
      merchantName: integrator.merchantName,
      offeringMerchantId: input.offeringMerchantId.trim(),
      offeringMerchantName: input.offeringMerchantName?.trim() || input.offeringMerchantId,
      productName: input.product.name,
      currency: input.currency,
      country: (input.country || 'NG').trim().toUpperCase().slice(0, 2),
      ...(productCreatorMerchantName ? { productCreatorMerchantName } : {}),
      ...(subMerchant ? { subMerchant } : {}),
      externalUser: {
        id: input.userId,
        name,
        email,
        phone,
        bvn
      },
      application: {
        contractSnapshot: this.buildContractSnapshot(
          input,
          input.product,
          globalProductId,
          upstreamCatalog
        ),
        payoutSplit: {},
        status: 'submitted',
        merchantProductId: input.product.id
      }
    };

    try {
      const response = await axios.post<UpstreamExternalApplicationResponse>(
        `${config.plataAccountServiceUrl}/api/v1/products/external-applications`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getUpstreamAuthHeaders()
          },
          timeout: config.walletServiceHttpTimeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
        const upstreamApplicationId = response.data?.data?.application?.id;
        return {
          upstreamApplicationId,
          applicationCreated: response.data?.data?.applicationCreated,
          upstreamAccount: this.extractUpstreamAccount(response.data)
        };
      }

      const errMsg =
        (typeof response.data === 'object' && response.data?.error) ||
        `Upstream returned HTTP ${response.status}`;

      if (response.status >= 500) {
        console.warn('Upstream external-applications unavailable (non-fatal):', errMsg);
        return { skipped: true, skipReason: errMsg };
      }

      throw new Error(errMsg);
    } catch (error) {
      if (error instanceof Error && !axios.isAxiosError(error)) {
        throw error;
      }
      const message = axios.isAxiosError(error)
        ? String(
            error.response?.data &&
              typeof error.response.data === 'object' &&
              'error' in error.response.data
              ? (error.response.data as { error?: string }).error
              : error.message
          )
        : 'Upstream external-applications request failed';
      if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        console.warn('Upstream external-applications unavailable (non-fatal):', message);
        return { skipped: true, skipReason: message };
      }
      throw new Error(message);
    }
  }
}

export default new UpstreamApplicationService();
