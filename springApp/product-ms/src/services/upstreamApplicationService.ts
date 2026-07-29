import axios from 'axios';
import { config } from '../config/environment';
import { ApiError } from '../middleware/errorHandler';
import type { Product } from '../types/product';
import type {
  SubmitUpstreamExternalApplicationInput,
  SubmitUpstreamExternalApplicationResult,
  SubmitUpstreamFinalApplicationInput,
  SubmitUpstreamFinalApplicationResult,
  SubmitSavingsEnrollmentInput,
  ResolveUpstreamApplicationForGuarantorInput,
  ResolveUpstreamApplicationForGuarantorResult,
  UpstreamGuarantorKycInput,
  UpstreamGuarantorKycResult,
  UpstreamSpouseKycInput,
  UpstreamSpouseKycResult
} from '../types/upstreamApplication';
import type { ValidatedPlatformApplicationFields } from '../types/platformApplicationFields';

type UpstreamCatalogProduct = Product & {
  merchant?: {
    id?: string;
    name?: string | null;
    companyName?: string | null;
  };
  calculatedConfig?: Record<string, unknown>;
};

/** POST /api/v1/products/external-accounts (via account-ms gateway only). */
type UpstreamExternalAccountBody = {
  appId: string;
  productId: string;
  currency?: string;
  country?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    bvn: string;
  };
};

type UpstreamSubmittedRequirement = {
  otherRequirementIndex?: number;
  documentsToDownloadIndex?: number;
  requirementType?: string;
  contentType: 'document_upload' | 'document_template';
  templateFileUrl?: string;
  submittedFileUrl: string;
  submittedFileKey?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
};

type UpstreamExternalApplicationBody = {
  appId: string;
  productId: string;
  productName?: string;
  merchantId: string;
  merchantName?: string;
  productCreatorMerchantName?: string;
  offeringMerchantId: string;
  offeringMerchantName?: string;
  loanWorkflowCallbackUrl?: string;
  guarantorKycCallbackUrl?: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    bvn: string;
  };
  application: {
    localApplicationId?: string;
    contractSnapshot: Record<string, unknown>;
    payoutSplit: Record<string, unknown>;
    status: 'draft' | 'submitted';
    submittedAt?: string;
    submittedRequirements?: UpstreamSubmittedRequirement[];
    isPoliticallyExposedPerson?: boolean;
    monthlyIncome?: number;
    repaymentSource?: string;
    repaymentSourceOther?: string;
    maritalStatus?: string;
    maritalStatusOther?: string;
    loanReason?: string;
    loanReasonOther?: string;
    repayingWithSpouse?: boolean;
    spouseFullName?: string;
    spouseEmail?: string;
    spousePhone?: string;
    spouseOccupation?: string;
    spouseCountry?: string;
    applicantProfileSnapshot?: Record<string, unknown>;
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

type UpstreamUserProductApplication = {
  id?: string;
  _id?: string;
  [key: string]: unknown;
};

type UpstreamUserProductApplicationListResponse = {
  success?: boolean;
  data?: UpstreamUserProductApplication[];
  error?: string;
};

type UpstreamUserProductApplicationCreateResponse = {
  success?: boolean;
  application?: UpstreamUserProductApplication;
  data?: UpstreamUserProductApplication | { application?: UpstreamUserProductApplication };
  error?: string;
};

type UpstreamGuarantorKycResponse = {
  success?: boolean;
  data?: {
    guarantor?: UpstreamGuarantorKycResult;
    [key: string]: unknown;
  };
  verificationUrl?: string;
  error?: string;
  message?: string;
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
      'payonusNubanAccountNumber',
      'payonus_nuban_account_number',
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
      bankName: this.firstStringFrom(record, ['bankName', 'bank_name', 'bank', 'payonusNubanBankName']),
      bankCode: this.firstStringFrom(record, ['bankCode', 'bank_code', 'payonusNubanBankCode']),
      providerReference: this.firstStringFrom(record, [
        'providerReference',
        'provider_reference',
        'reference',
        'id',
        'walletId',
        'wallet_id',
        'payonusNubanProviderReference'
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
      throw new Error('Could not resolve Plata appId for upstream external-accounts');
    }
    return plataAppId;
  }

  private resolveCreatorMerchantId(
    upstreamCatalog: UpstreamCatalogProduct | null,
    fallbackMerchantId: string
  ): string {
    const merchantId = (
      upstreamCatalog?.merchant?.id ||
      config.plataIntegratorMerchantId ||
      fallbackMerchantId ||
      ''
    ).trim();
    if (!merchantId) {
      throw new Error('Could not resolve Plata creator merchantId for upstream application snapshot');
    }
    return merchantId;
  }

  private resolveCreatorMerchantName(upstreamCatalog: UpstreamCatalogProduct | null): string | undefined {
    return (
      upstreamCatalog?.merchant?.companyName ||
      upstreamCatalog?.merchant?.name ||
      config.plataIntegratorMerchantName ||
      undefined
    );
  }

  private userProductApplicationId(application: UpstreamUserProductApplication | undefined): string | undefined {
    return this.firstStringFrom(application ?? null, ['id', '_id']);
  }

  private guarantorUpstreamTimeoutMs(): number {
    return Math.max(config.walletServiceHttpTimeoutMs, 45_000);
  }

  private finalUpstreamTimeoutMs(): number {
    return Math.max(config.walletServiceHttpTimeoutMs, 45_000);
  }

  /** Init / external-accounts: same floor as final submit so cold Plata + PayOnUs fits. */
  private externalAccountsUpstreamTimeoutMs(): number {
    return Math.max(config.walletServiceHttpTimeoutMs, 45_000);
  }

  /** Initial attempt + 2 retries on transient account-creation failures. */
  private static readonly EXTERNAL_ACCOUNTS_MAX_ATTEMPTS = 3;
  private static readonly EXTERNAL_ACCOUNTS_RETRY_DELAYS_MS = [500, 1500] as const;

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isExistingAccountProvisioningMessage(message: string | undefined): boolean {
    const normalized = message?.trim().toLowerCase() || '';
    return (
      normalized.includes('already generated') ||
      normalized.includes('already exists') ||
      normalized.includes('existing fixed virtual account')
    );
  }

  private isTransientExternalAccountsGatewayAuthMessage(message: string | undefined): boolean {
    const normalized = message?.trim().toLowerCase() || '';
    return (
      normalized.includes('gateway authentication failed') ||
      normalized.includes('gateway auth service unavailable')
    );
  }

  private externalAccountsAttemptSucceeded(
    result: SubmitUpstreamExternalApplicationResult
  ): boolean {
    if (result.skipped) {
      return false;
    }
    return Boolean(result.upstreamAccount?.accountNumber?.trim());
  }

  private shouldRetryExternalAccountsResult(
    result: SubmitUpstreamExternalApplicationResult
  ): boolean {
    if (result.skipped) {
      // Transient upstream/gateway outages are returned as skipped 5xx-style reasons.
      return true;
    }
    const provisionError = result.upstreamAccount?.provisionError;
    if (this.isExistingAccountProvisioningMessage(provisionError)) {
      return false;
    }
    // HTTP success but PayOnUs/NUBAN did not yield an account number yet.
    return !result.upstreamAccount?.accountNumber?.trim();
  }

  private shouldRetryExternalAccountsError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true;
    }
    if (this.isTransientExternalAccountsGatewayAuthMessage(error.message)) {
      return true;
    }
    if ((error as Error & { nonRetryable?: boolean }).nonRetryable === true) {
      return false;
    }
    if (this.isExistingAccountProvisioningMessage(error.message)) {
      return false;
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        return false;
      }
      return true;
    }
    return true;
  }

  private throwNonRetryableExternalAccountsError(message: string, status?: number): never {
    const error = new Error(message) as Error & { nonRetryable?: boolean; httpStatus?: number };
    error.nonRetryable = true;
    if (typeof status === 'number') {
      error.httpStatus = status;
    }
    throw error;
  }

  private async postExternalAccountsOnce(
    body: UpstreamExternalAccountBody
  ): Promise<SubmitUpstreamExternalApplicationResult> {
    try {
      const response = await axios.post<UpstreamExternalApplicationResponse>(
        `${config.plataAccountServiceUrl}/api/v1/products/external-accounts`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getUpstreamAuthHeaders()
          },
          timeout: this.externalAccountsUpstreamTimeoutMs(),
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
        return { skipped: true, skipReason: errMsg };
      }

      if (this.isTransientExternalAccountsGatewayAuthMessage(String(errMsg))) {
        throw new Error(String(errMsg));
      }

      this.throwNonRetryableExternalAccountsError(String(errMsg), response.status);
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
        : 'Upstream external-accounts request failed';
      if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        return { skipped: true, skipReason: message };
      }
      if (this.isTransientExternalAccountsGatewayAuthMessage(message)) {
        throw new Error(message);
      }
      if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
        this.throwNonRetryableExternalAccountsError(message, error.response.status);
      }
      throw new Error(message);
    }
  }

  private async lookupSubmittedUpstreamApplication(input: {
    plataAppId: string;
    globalProductId: string;
    userId: string;
    offeringMerchantId: string;
    localApplicationId: string;
    timeoutMs: number;
  }): Promise<string | undefined> {
    const existing = await axios.get<UpstreamUserProductApplicationListResponse>(
      `${config.plataAccountServiceUrl}/api/v1/products/applications`,
      {
        headers: this.getUpstreamAuthHeaders(),
        params: {
          appId: input.plataAppId,
          userId: input.userId,
          offeringMerchantId: input.offeringMerchantId,
          globalProductId: input.globalProductId,
          status: 'submitted',
          limit: 10,
          skip: 0
        },
        timeout: input.timeoutMs,
        validateStatus: () => true
      }
    );

    if (existing.status < 200 || existing.status >= 300 || !Array.isArray(existing.data?.data)) {
      return undefined;
    }

    // Only accept an exact localApplicationId match. Never fall back to data[0] —
    // that can attach another customer's upstream mortgage/loan application.
    const matched = existing.data.data.find((item) => {
      const record = this.asRecord(item);
      return (
        this.firstStringFrom(record, ['localApplicationId', 'local_application_id']) ===
        input.localApplicationId
      );
    });

    return this.userProductApplicationId(matched);
  }

  private async safeLookupSubmittedUpstreamApplication(input: {
    plataAppId: string;
    globalProductId: string;
    userId: string;
    offeringMerchantId: string;
    localApplicationId: string;
    timeoutMs: number;
  }): Promise<string | undefined> {
    try {
      return await this.lookupSubmittedUpstreamApplication(input);
    } catch (error) {
      this.logError('Upstream submitted application reconciliation lookup failed:', error);
      return undefined;
    }
  }

  async resolveUpstreamApplicationForGuarantor(
    input: ResolveUpstreamApplicationForGuarantorInput
  ): Promise<ResolveUpstreamApplicationForGuarantorResult> {
    if (!this.isConfigured()) {
      throw new Error('Plata upstream keys not configured');
    }

    const timeoutMs = this.guarantorUpstreamTimeoutMs();
    const globalProductId = this.resolveGlobalProductId(input.product);
    const upstreamCatalog = await this.fetchUpstreamCatalogProduct(globalProductId);
    const plataAppId = this.resolvePlataAppId(input.product, upstreamCatalog);
    const offeringMerchantId = input.offeringMerchantId.trim();
    if (!offeringMerchantId) {
      throw new Error('offeringMerchantId is required to resolve upstream application for guarantor KYC');
    }

    const creatorMerchantId = this.resolveCreatorMerchantId(upstreamCatalog, offeringMerchantId);
    const email = input.email.trim();
    const name = input.applicantName.trim();
    const phone = input.phone.trim();
    const bvn = input.bvn.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('valid email is required to resolve upstream application for guarantor KYC');
    }
    if (!name) {
      throw new Error('applicantName is required to resolve upstream application for guarantor KYC');
    }
    if (!phone) {
      throw new Error('phone is required to resolve upstream application for guarantor KYC');
    }
    if (!/^\d{11}$/.test(bvn)) {
      throw new Error('bvn must be exactly 11 digits to resolve upstream application for guarantor KYC');
    }

    const lookupStartedAt = Date.now();
    const existing = await axios.get<UpstreamUserProductApplicationListResponse>(
      `${config.plataAccountServiceUrl}/api/v1/products/applications`,
      {
        headers: this.getUpstreamAuthHeaders(),
        params: {
          appId: plataAppId,
          globalProductId,
          offeringMerchantId,
          limit: 20,
          skip: 0
        },
        timeout: timeoutMs,
        validateStatus: () => true
      }
    );

    if (existing.status >= 200 && existing.status < 300 && Array.isArray(existing.data?.data)) {
      // Exact localApplicationId only — never reuse another applicant's Basquait/loan app.
      const matched = existing.data.data.find((item) => {
        const record = this.asRecord(item);
        return (
          this.firstStringFrom(record, ['localApplicationId', 'local_application_id']) ===
          input.localApplicationId
        );
      });
      const upstreamApplicationId = this.userProductApplicationId(matched);
      if (upstreamApplicationId) {
        return { upstreamApplicationId, applicationCreated: false };
      }
    }

    const createStartedAt = Date.now();
    const creatorMerchantName = this.resolveCreatorMerchantName(upstreamCatalog);
    const body: UpstreamExternalApplicationBody = {
      appId: plataAppId,
      productId: globalProductId,
      productName: input.product.name,
      merchantId: creatorMerchantId,
      merchantName: creatorMerchantName,
      productCreatorMerchantName: creatorMerchantName,
      offeringMerchantId,
      offeringMerchantName: input.offeringMerchantName,
      loanWorkflowCallbackUrl: config.loanWorkflowCallbackUrl,
      guarantorKycCallbackUrl: config.guarantorKycCallbackUrl,
      user: {
        id: input.userId,
        name,
        email,
        phone,
        bvn
      },
      application: {
        localApplicationId: input.localApplicationId,
        contractSnapshot: {
          principal: input.amount,
          requestedAmount: input.amount,
          amount: input.amount,
          currency: input.currency,
          productId: input.product.id,
          productName: input.product.name,
          productType: input.product.type,
          applicantName: name,
          offeringMerchantName: input.offeringMerchantName,
          guarantorKycStage: 'requirements'
        },
        payoutSplit: {},
        status: 'draft'
      }
    };

    const response = await axios.post<UpstreamUserProductApplicationCreateResponse>(
      `${config.plataAccountServiceUrl}/api/v1/products/external-applications`,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getUpstreamAuthHeaders()
        },
        timeout: timeoutMs,
        validateStatus: () => true
      }
    );

    if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
      const upstreamApplicationId =
        this.userProductApplicationId(response.data?.application) ??
        this.userProductApplicationId(response.data?.data as UpstreamUserProductApplication | undefined) ??
        this.userProductApplicationId(
          this.asRecord(response.data?.data ?? null)?.application as UpstreamUserProductApplication | undefined
        );
      if (!upstreamApplicationId) {
        throw new Error('Upstream did not return an application id for guarantor KYC');
      }
      return { upstreamApplicationId, applicationCreated: true };
    }

    throw new Error(
      (typeof response.data === 'object' && response.data?.error) ||
        `Upstream returned HTTP ${response.status}`
    );
  }

  async createGuarantorKyc(
    upstreamApplicationId: string,
    guarantor: UpstreamGuarantorKycInput
  ): Promise<UpstreamGuarantorKycResult> {
    if (!this.isConfigured()) {
      throw new Error('Plata upstream keys not configured');
    }

    const response = await axios.post<UpstreamGuarantorKycResponse>(
      `${config.plataAccountServiceUrl}/api/v1/products/applications/${upstreamApplicationId}/guarantor-kyc`,
      guarantor,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getUpstreamAuthHeaders()
        },
        timeout: this.guarantorUpstreamTimeoutMs(),
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300 || response.data?.success === false) {
      const message =
        response.data?.error || response.data?.message || `Upstream returned HTTP ${response.status}`;
      if (response.status === 400) {
        throw new ApiError(400, message);
      }
      throw new Error(message);
    }

    const result = response.data?.data?.guarantor;
    if (!result?.verificationUrl && !response.data?.verificationUrl) {
      throw new Error('Upstream did not return a guarantor verification URL');
    }

    return {
      ...guarantor,
      ...(result || {}),
      id: result?.id || guarantor.guarantorId || '',
      verificationUrl: result?.verificationUrl || response.data?.verificationUrl
    };
  }

  async createSpouseKyc(
    upstreamApplicationId: string,
    spouse: UpstreamSpouseKycInput
  ): Promise<UpstreamSpouseKycResult> {
    if (!this.isConfigured()) {
      throw new Error('Plata upstream keys not configured');
    }

    type UpstreamSpouseKycResponse = {
      success?: boolean;
      error?: string;
      message?: string;
      verificationUrl?: string;
      data?: {
        spouse?: UpstreamSpouseKycResult;
      };
    };

    const response = await axios.post<UpstreamSpouseKycResponse>(
      `${config.plataAccountServiceUrl}/api/v1/products/applications/${upstreamApplicationId}/spouse-kyc`,
      spouse,
      {
        headers: {
          'Content-Type': 'application/json',
          ...this.getUpstreamAuthHeaders()
        },
        timeout: this.guarantorUpstreamTimeoutMs(),
        validateStatus: () => true
      }
    );

    if (response.status < 200 || response.status >= 300 || response.data?.success === false) {
      const message =
        response.data?.error || response.data?.message || `Upstream returned HTTP ${response.status}`;
      if (response.status === 400) {
        throw new ApiError(400, message);
      }
      throw new Error(message);
    }

    const result = response.data?.data?.spouse;
    if (!result?.verificationUrl && !response.data?.verificationUrl) {
      throw new Error('Upstream did not return a spouse verification URL');
    }

    return {
      ...spouse,
      ...(result || {}),
      id: result?.id || 'spouse',
      verificationUrl: result?.verificationUrl || response.data?.verificationUrl
    };
  }

  private buildSubmittedRequirements(input: SubmitUpstreamFinalApplicationInput): UpstreamSubmittedRequirement[] {
    const submittedRequirements: UpstreamSubmittedRequirement[] = [];
    const submissions = input.requirementSubmissions ?? [];
    const documentsToDownload = input.product.requirements?.documentsToDownload ?? [];
    const otherRequirements = input.product.requirements?.otherRequirements ?? [];

    for (const submission of submissions) {
      const submittedFileUrl = submission.fileUrl?.trim();
      if (!submittedFileUrl) {
        continue;
      }

      const keys = [submission.requirementId, submission.requirementType, submission.label]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());

      const documentIndex = documentsToDownload.findIndex((item) => {
        const name = item.name?.trim();
        return Boolean(name && keys.includes(name));
      });

      if (documentIndex >= 0) {
        const document = documentsToDownload[documentIndex];
        submittedRequirements.push({
          documentsToDownloadIndex: documentIndex,
          requirementType: submission.requirementType || submission.label || document.name,
          contentType: 'document_template',
          templateFileUrl: document.fileUrl,
          submittedFileUrl,
          submittedFileKey: typeof submission.metadata?.key === 'string' ? submission.metadata.key : undefined,
          fileName: submission.fileName,
          fileType: submission.fileType,
          fileSize: submission.fileSize,
          uploadedAt: typeof submission.metadata?.uploadedAt === 'string' ? submission.metadata.uploadedAt : undefined
        });
        continue;
      }

      const otherIndex = otherRequirements.findIndex((item) => {
        const key = item.requirementType?.trim() || item.description?.trim();
        return Boolean(key && keys.includes(key));
      });

      if (otherIndex >= 0) {
        const requirement = otherRequirements[otherIndex];
        submittedRequirements.push({
          otherRequirementIndex: otherIndex,
          requirementType: submission.requirementType || submission.label || requirement.requirementType,
          contentType: requirement.contentType === 'document_template' ? 'document_template' : 'document_upload',
          templateFileUrl: typeof submission.metadata?.templateFileUrl === 'string' ? submission.metadata.templateFileUrl : undefined,
          submittedFileUrl,
          submittedFileKey: typeof submission.metadata?.key === 'string' ? submission.metadata.key : undefined,
          fileName: submission.fileName,
          fileType: submission.fileType,
          fileSize: submission.fileSize,
          uploadedAt: typeof submission.metadata?.uploadedAt === 'string' ? submission.metadata.uploadedAt : undefined
        });
      }
    }

    return submittedRequirements;
  }

  private upstreamApplicationPlatformFields(
    platformFields: ValidatedPlatformApplicationFields | undefined
  ): Partial<UpstreamExternalApplicationBody['application']> {
    if (!platformFields) {
      return {};
    }
    return { ...platformFields };
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

    const body: UpstreamExternalAccountBody = {
      appId: plataAppId,
      productId: globalProductId,
      currency: input.currency,
      country: (input.country || 'NG').trim().toUpperCase().slice(0, 2),
      user: {
        id: input.userId,
        name,
        email,
        phone,
        bvn
      }
    };

    const maxAttempts = UpstreamApplicationService.EXTERNAL_ACCOUNTS_MAX_ATTEMPTS;
    let lastResult: SubmitUpstreamExternalApplicationResult | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.postExternalAccountsOnce(body);

        if (this.externalAccountsAttemptSucceeded(result)) {
          if (attempt > 1) {
            console.info(
              `Upstream external-accounts succeeded on attempt ${attempt}/${maxAttempts}`
            );
          }
          return result;
        }

        lastResult = result;
        const reason =
          result.skipReason ||
          result.upstreamAccount?.provisionError ||
          'Plata did not return a created account number';

        if (!this.shouldRetryExternalAccountsResult(result) || attempt >= maxAttempts) {
          if (result.skipped) {
            console.warn('Upstream external-accounts unavailable (non-fatal):', reason);
          }
          return result;
        }

        const delayMs =
          UpstreamApplicationService.EXTERNAL_ACCOUNTS_RETRY_DELAYS_MS[
            Math.min(attempt - 1, UpstreamApplicationService.EXTERNAL_ACCOUNTS_RETRY_DELAYS_MS.length - 1)
          ];
        console.warn(
          `Upstream external-accounts attempt ${attempt}/${maxAttempts} failed (${reason}); retrying in ${delayMs}ms`
        );
        await this.sleep(delayMs);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upstream external-accounts request failed';
        if (!this.shouldRetryExternalAccountsError(error) || attempt >= maxAttempts) {
          throw error instanceof Error ? error : new Error(message);
        }

        const delayMs =
          UpstreamApplicationService.EXTERNAL_ACCOUNTS_RETRY_DELAYS_MS[
            Math.min(attempt - 1, UpstreamApplicationService.EXTERNAL_ACCOUNTS_RETRY_DELAYS_MS.length - 1)
          ];
        console.warn(
          `Upstream external-accounts attempt ${attempt}/${maxAttempts} failed (${message}); retrying in ${delayMs}ms`
        );
        await this.sleep(delayMs);
      }
    }

    return lastResult ?? { skipped: true, skipReason: 'Upstream external-accounts request failed' };
  }

  async submitFinalApplication(
    input: SubmitUpstreamFinalApplicationInput
  ): Promise<SubmitUpstreamFinalApplicationResult> {
    if (!this.isConfigured()) {
      return { skipped: true, skipReason: 'Plata upstream keys not configured' };
    }

    const globalProductId = this.resolveGlobalProductId(input.product);
    const upstreamCatalog = await this.fetchUpstreamCatalogProduct(globalProductId);
    const plataAppId = this.resolvePlataAppId(input.product, upstreamCatalog);
    const offeringMerchantId = input.offeringMerchantId.trim();
    if (!offeringMerchantId) {
      return { skipped: true, skipReason: 'offeringMerchantId is required for upstream application snapshot' };
    }
    const creatorMerchantId = this.resolveCreatorMerchantId(upstreamCatalog, offeringMerchantId);
    const email = input.email.trim();
    const name = input.applicantName.trim();
    const phone = input.phone.trim();
    const bvn = input.bvn.trim();
    const submittedRequirements = this.buildSubmittedRequirements(input);
    const timeoutMs = this.finalUpstreamTimeoutMs();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { skipped: true, skipReason: 'valid email is required for upstream application snapshot' };
    }
    if (!name) {
      return { skipped: true, skipReason: 'applicantName is required for upstream application snapshot' };
    }
    if (!phone) {
      return { skipped: true, skipReason: 'phone is required for upstream application snapshot' };
    }
    if (!/^\d{11}$/.test(bvn)) {
      return { skipped: true, skipReason: 'bvn must be exactly 11 digits for upstream application snapshot' };
    }

    try {
      // Always POST so Plata upserts status/platform fields and applicantProfileSnapshot
      // even when a draft upstream application already exists (early guarantor/spouse KYC).
      const creatorMerchantName = this.resolveCreatorMerchantName(upstreamCatalog);
      const body: UpstreamExternalApplicationBody = {
        appId: plataAppId,
        productId: globalProductId,
        productName: input.product.name,
        merchantId: creatorMerchantId,
        merchantName: creatorMerchantName,
        productCreatorMerchantName: creatorMerchantName,
        offeringMerchantId,
        offeringMerchantName: input.offeringMerchantName,
        loanWorkflowCallbackUrl: config.loanWorkflowCallbackUrl,
        guarantorKycCallbackUrl: config.guarantorKycCallbackUrl,
        user: {
          id: input.userId,
          name,
          email,
          phone,
          bvn
        },
        application: {
          localApplicationId: input.localApplicationId,
          contractSnapshot: {
            ...input.contractSnapshot,
            productName: input.product.name,
            applicantName: name,
            offeringMerchantName: input.offeringMerchantName
          },
          payoutSplit: {},
          status: 'submitted',
          submittedAt: input.submittedAt,
          submittedRequirements,
          ...this.upstreamApplicationPlatformFields(input.platformFields),
          ...(input.applicantProfileSnapshot
            ? { applicantProfileSnapshot: input.applicantProfileSnapshot }
            : {})
        }
      };

      const response = await axios.post<UpstreamUserProductApplicationCreateResponse>(
        `${config.plataAccountServiceUrl}/api/v1/products/external-applications`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getUpstreamAuthHeaders()
          },
          timeout: timeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
        return {
          upstreamApplicationId:
            this.userProductApplicationId(response.data?.application) ??
            this.userProductApplicationId(response.data?.data as UpstreamUserProductApplication | undefined) ??
            this.userProductApplicationId(
              this.asRecord(response.data?.data ?? null)?.application as UpstreamUserProductApplication | undefined
            ),
          applicationCreated: true
        };
      }

      const errMsg =
        (typeof response.data === 'object' && response.data?.error) ||
        `Upstream returned HTTP ${response.status}`;

      if (response.status >= 500) {
        const reconciledUpstreamApplicationId = await this.safeLookupSubmittedUpstreamApplication({
          plataAppId,
          globalProductId,
          userId: input.userId,
          offeringMerchantId,
          localApplicationId: input.localApplicationId,
          timeoutMs
        });
        if (reconciledUpstreamApplicationId) {
          return { upstreamApplicationId: reconciledUpstreamApplicationId, applicationCreated: false };
        }
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
        : 'Upstream application snapshot request failed';
      if (
        axios.isAxiosError(error) &&
        (error.code === 'ECONNABORTED' || String(error.message).toLowerCase().includes('timeout'))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2_500));
        const reconciledUpstreamApplicationId = await this.safeLookupSubmittedUpstreamApplication({
          plataAppId,
          globalProductId,
          userId: input.userId,
          offeringMerchantId,
          localApplicationId: input.localApplicationId,
          timeoutMs
        });
        if (reconciledUpstreamApplicationId) {
          return { upstreamApplicationId: reconciledUpstreamApplicationId, applicationCreated: false };
        }
      }
      if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        return { skipped: true, skipReason: message };
      }
      throw new Error(message);
    }
  }

  /**
   * Instant SAVINGS enrollment on Plata: provisions user + wallet under the product creator merchant
   * and stores a submitted application snapshot on the creator's Plata app + global product id.
   */
  async submitSavingsEnrollment(
    input: SubmitSavingsEnrollmentInput
  ): Promise<SubmitUpstreamExternalApplicationResult & { applicationCreated?: boolean }> {
    if (!this.isConfigured()) {
      return { skipped: true, skipReason: 'Plata upstream keys not configured' };
    }

    const globalProductId = this.resolveGlobalProductId(input.product);
    const upstreamCatalog = await this.fetchUpstreamCatalogProduct(globalProductId);
    const plataAppId = this.resolvePlataAppId(input.product, upstreamCatalog);
    const offeringMerchantId = input.offeringMerchantId.trim();
    if (!offeringMerchantId) {
      return { skipped: true, skipReason: 'offeringMerchantId is required for Plata savings enrollment' };
    }

    const creatorMerchantId = this.resolveCreatorMerchantId(upstreamCatalog, offeringMerchantId);
    const email = input.email.trim();
    const name = input.applicantName.trim();
    const phone = input.phone.trim();
    const bvn = input.bvn.trim();
    const timeoutMs = this.finalUpstreamTimeoutMs();
    const submittedAt = new Date().toISOString();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { skipped: true, skipReason: 'valid email is required for Plata savings enrollment' };
    }
    if (!name) {
      return { skipped: true, skipReason: 'applicantName is required for Plata savings enrollment' };
    }
    if (!phone) {
      return { skipped: true, skipReason: 'phone is required for Plata savings enrollment' };
    }
    if (!/^\d{11}$/.test(bvn)) {
      return { skipped: true, skipReason: 'bvn must be exactly 11 digits for Plata savings enrollment' };
    }

    try {
      const existingUpstreamApplicationId = await this.safeLookupSubmittedUpstreamApplication({
        plataAppId,
        globalProductId,
        userId: input.userId,
        offeringMerchantId,
        localApplicationId: input.localApplicationId,
        timeoutMs
      });
      if (existingUpstreamApplicationId) {
        return { upstreamApplicationId: existingUpstreamApplicationId, applicationCreated: false };
      }

      const creatorMerchantName = this.resolveCreatorMerchantName(upstreamCatalog);
      const body: UpstreamExternalApplicationBody = {
        appId: plataAppId,
        productId: globalProductId,
        productName: input.product.name,
        merchantId: creatorMerchantId,
        merchantName: creatorMerchantName,
        productCreatorMerchantName: creatorMerchantName,
        offeringMerchantId,
        offeringMerchantName: input.offeringMerchantName,
        user: {
          id: input.userId,
          name,
          email,
          phone,
          bvn
        },
        application: {
          localApplicationId: input.localApplicationId,
          contractSnapshot: {
            ...input.contractSnapshot,
            productName: input.product.name,
            productType: input.product.type,
            applicantName: name,
            offeringMerchantName: input.offeringMerchantName,
            savingsBalance: 0,
            currentBalance: 0,
            currency: input.currency
          },
          payoutSplit: {},
          status: 'submitted',
          submittedAt,
          ...(input.isPoliticallyExposedPerson !== undefined
            ? { isPoliticallyExposedPerson: input.isPoliticallyExposedPerson }
            : {}),
          ...(input.monthlyIncome !== undefined ? { monthlyIncome: input.monthlyIncome } : {}),
          ...(input.repaymentSource ? { repaymentSource: input.repaymentSource } : {}),
          ...(input.repaymentSourceOther ? { repaymentSourceOther: input.repaymentSourceOther } : {}),
          ...(input.maritalStatus ? { maritalStatus: input.maritalStatus } : {}),
          ...(input.maritalStatusOther ? { maritalStatusOther: input.maritalStatusOther } : {})
        }
      };

      const response = await axios.post<UpstreamExternalApplicationResponse>(
        `${config.plataAccountServiceUrl}/api/v1/products/external-applications`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getUpstreamAuthHeaders()
          },
          timeout: timeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
        const upstreamApplicationId =
          this.userProductApplicationId(
            response.data?.application as UpstreamUserProductApplication | undefined
          ) ??
          this.userProductApplicationId(response.data?.data as UpstreamUserProductApplication | undefined) ??
          this.userProductApplicationId(
            this.asRecord(response.data?.data ?? null)?.application as UpstreamUserProductApplication | undefined
          );
        return {
          upstreamApplicationId,
          applicationCreated: true,
          upstreamAccount: this.extractUpstreamAccount(response.data)
        };
      }

      const errMsg =
        (typeof response.data === 'object' && response.data?.error) ||
        `Upstream returned HTTP ${response.status}`;

      if (response.status >= 500) {
        const reconciledUpstreamApplicationId = await this.safeLookupSubmittedUpstreamApplication({
          plataAppId,
          globalProductId,
          userId: input.userId,
          offeringMerchantId,
          localApplicationId: input.localApplicationId,
          timeoutMs
        });
        if (reconciledUpstreamApplicationId) {
          return { upstreamApplicationId: reconciledUpstreamApplicationId, applicationCreated: false };
        }
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
        : 'Upstream savings enrollment request failed';
      if (axios.isAxiosError(error) && error.response && error.response.status >= 500) {
        return { skipped: true, skipReason: message };
      }
      throw new Error(message);
    }
  }

  async syncSavingsDepositSnapshot(
    input: SubmitSavingsEnrollmentInput
  ): Promise<SubmitUpstreamExternalApplicationResult> {
    if (!this.isConfigured()) {
      return { skipped: true, skipReason: 'Plata upstream keys not configured' };
    }

    const globalProductId = this.resolveGlobalProductId(input.product);
    const upstreamCatalog = await this.fetchUpstreamCatalogProduct(globalProductId);
    const plataAppId = this.resolvePlataAppId(input.product, upstreamCatalog);
    const offeringMerchantId = input.offeringMerchantId.trim();
    if (!offeringMerchantId) {
      return { skipped: true, skipReason: 'offeringMerchantId is required for Plata savings deposit sync' };
    }

    const creatorMerchantId = this.resolveCreatorMerchantId(upstreamCatalog, offeringMerchantId);
    const email = input.email.trim();
    const name = input.applicantName.trim();
    const phone = input.phone.trim();
    const bvn = input.bvn.trim();
    const timeoutMs = this.finalUpstreamTimeoutMs();
    const submittedAt = new Date().toISOString();

    try {
      const creatorMerchantName = this.resolveCreatorMerchantName(upstreamCatalog);
      const body: UpstreamExternalApplicationBody = {
        appId: plataAppId,
        productId: globalProductId,
        productName: input.product.name,
        merchantId: creatorMerchantId,
        merchantName: creatorMerchantName,
        productCreatorMerchantName: creatorMerchantName,
        offeringMerchantId,
        offeringMerchantName: input.offeringMerchantName,
        user: {
          id: input.userId,
          name,
          email,
          phone,
          bvn
        },
        application: {
          localApplicationId: input.localApplicationId,
          contractSnapshot: {
            ...input.contractSnapshot,
            productName: input.product.name,
            productType: input.product.type,
            applicantName: name,
            offeringMerchantName: input.offeringMerchantName,
            currency: input.currency
          },
          payoutSplit: {},
          status: 'submitted',
          submittedAt
        }
      };

      const response = await axios.post<UpstreamExternalApplicationResponse>(
        `${config.plataAccountServiceUrl}/api/v1/products/external-applications`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getUpstreamAuthHeaders()
          },
          timeout: timeoutMs,
          validateStatus: () => true
        }
      );

      if (response.status >= 200 && response.status < 300 && response.data?.success !== false) {
        const upstreamApplicationId =
          this.userProductApplicationId(
            response.data?.application as UpstreamUserProductApplication | undefined
          ) ??
          this.userProductApplicationId(response.data?.data as UpstreamUserProductApplication | undefined) ??
          this.userProductApplicationId(
            this.asRecord(response.data?.data ?? null)?.application as UpstreamUserProductApplication | undefined
          );
        return { upstreamApplicationId, applicationCreated: false };
      }

      const errMsg =
        (typeof response.data === 'object' && response.data?.error) ||
        `Upstream returned HTTP ${response.status}`;
      return { skipped: true, skipReason: errMsg };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? String(
            error.response?.data &&
              typeof error.response.data === 'object' &&
              'error' in error.response.data
              ? (error.response.data as { error?: string }).error
              : error.message
          )
        : 'Upstream savings deposit sync request failed';
      return { skipped: true, skipReason: message };
    }
  }
}

export default new UpstreamApplicationService();
