import { ApiError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { randomInt, randomUUID } from 'crypto';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  IProductApplicationDocument,
  ProductApplicationModel,
  toProductApplication
} from '../models/ProductApplicationModel';
import walletService from './walletService';
import {
  collectLoanCharge,
  collectMortgageCharge
} from './settlement/settlementChargeService';
import { resolveEquityContributionFromSnapshot } from './settlement/commissionCalculators';
import upstreamApplicationService from './upstreamApplicationService';
import complianceBvnService from './complianceBvnService';
import clientAuthUserService from './clientAuthUserService';
import merchantDisplayNameService from './merchantDisplayNameService';
import { validatePlatformApplicationFields } from '../utils/platformApplicationFields';
import {
  applyPlatformFieldsToApplication,
  extractPlatformFieldInput,
  hasPlatformFieldInput,
  mergePlatformFieldInput,
  platformFieldsFromApplication
} from '../utils/platformApplicationFieldInput';
import type { ValidatedPlatformApplicationFields } from '../types/platformApplicationFields';
import type { PlatformApplicationFieldInput } from '../types/platformApplicationFields';
import {
  sendGuarantorKycApprovedNotification,
  sendGuarantorApplicantReportedNotification,
  sendProductApplicationSubmittedNotification,
  sendProductApplicationWorkflowStageNotification
} from './applicationNotificationService';
import applicantProfileService from './applicantProfileService';
import {
  formatMoney,
  notifyLoanDisbursedFromSpring,
  resolvePropertyAddressFromSnapshot
} from './productFlowNotificationService';
import type { LoanRequirements, Product } from '../types/product';
import type {
  ApplicationListQuery,
  ProductApplicationListResult,
  ApplicationSummary,
  CreateApplicationGuarantorRequest,
  CreateApplicationSpouseKycRequest,
  CreateProductApplicationRequest,
  ProductApplication,
  ProductApplicationInitStatus,
  ProductApplicationStatus,
  PlataLoanWorkflowStatus,
  PlataLoanWorkflowWebhookResult,
  SaveProductApplicationProgressRequest,
  SubmitProductApplicationRequest,
  ProductRequirementSubmission,
  SubmitProductApplicationRequirementsRequest
} from '../types/productApplication';

function applicationFilters(query: ApplicationListQuery): Record<string, string> {
  const filters: Record<string, string> = {};
  if (query.merchantId) filters.merchantId = query.merchantId;
  if (query.userId) filters.userId = query.userId;
  if (query.productId) filters.productId = query.productId.trim();
  if (query.appId) filters.appId = query.appId.trim();
  if (query.status) filters.status = query.status;
  if (query.productType) filters.productType = query.productType.trim().toUpperCase();
  return filters;
}

const DEFAULT_APPLICATION_PAGE_SIZE = 20;
const MAX_APPLICATION_PAGE_SIZE = 20;

function normalizeApplicationPagination(query: ApplicationListQuery): { page: number; limit: number; skip: number } {
  const page = Number.isFinite(query.page) && query.page && query.page > 0 ? Math.floor(query.page) : 1;
  const requestedLimit =
    Number.isFinite(query.limit) && query.limit && query.limit > 0 ? Math.floor(query.limit) : DEFAULT_APPLICATION_PAGE_SIZE;
  const limit = Math.min(requestedLimit, MAX_APPLICATION_PAGE_SIZE);
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

type RequirementItem = {
  id?: string;
  requirementType?: string;
  contentType?: string;
  description?: string;
  uploadRequired?: boolean;
  required?: boolean;
};

type DownloadableDocumentItem = {
  id?: string;
  name?: string;
  fileUrl?: string;
  uploadRequired?: boolean;
  required?: boolean;
};

type ApplicationGuarantor = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
  kyc?: {
    userRef: string;
    customerId?: string;
    verificationId?: string;
    verificationUrl?: string;
    status?: unknown;
    reference?: unknown;
    totalChecks?: unknown;
    raw?: unknown;
  };
  createdAt: string;
  updatedAt: string;
};

type ApplicationSpouseKyc = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  occupation?: string;
  relationship?: string;
  country?: string;
  status?: string;
  provider?: string;
  providerReference?: string;
  verificationUrl?: string;
  requestedAt?: string;
  raw?: unknown;
};

export class ProductApplicationService {
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

  private normalizePlataWorkflowStatus(value: string | undefined): PlataLoanWorkflowStatus | undefined {
    const normalized = value?.trim().toLowerCase();
    if (
      normalized === 'under_review' ||
      normalized === 'approved' ||
      normalized === 'declined' ||
      normalized === 'blacklisted'
    ) {
      return normalized;
    }
    return undefined;
  }

  private localStatusFromPlataWorkflow(status: PlataLoanWorkflowStatus): ProductApplicationStatus {
    if (status === 'approved') return 'APPROVED';
    if (status === 'declined') return 'REJECTED';
    if (status === 'blacklisted') return 'BLACKLISTED';
    return 'PENDING';
  }

  private parseEventDate(value: string | undefined): Date {
    if (!value) {
      return new Date();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private parseFiniteAmount(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const normalized = value.replace(/,/g, '').trim();
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private firstAmountFrom(record: Record<string, unknown> | null, keys: string[]): number | undefined {
    if (!record) {
      return undefined;
    }
    for (const key of keys) {
      const amount = this.parseFiniteAmount(record[key]);
      if (amount !== undefined) {
        return amount;
      }
    }
    return undefined;
  }

  private approvalAmountFrom(
    data: Record<string, unknown>,
    applicationRecord: Record<string, unknown> | null
  ): number | undefined {
    const amountKeys = [
      'approvedAmount',
      'approved_amount',
      'approvedLoanAmount',
      'approved_loan_amount',
      'disbursedAmount',
      'disbursed_amount',
      'loanAmount',
      'loan_amount',
      'principal',
      'amount'
    ];
    const direct = this.firstAmountFrom(data, amountKeys) ?? this.firstAmountFrom(applicationRecord, amountKeys);
    if (direct !== undefined) {
      return direct;
    }

    const contractSnapshot =
      this.asRecord(data.contractSnapshot) ??
      this.asRecord(data.contract_snapshot) ??
      this.asRecord(applicationRecord?.contractSnapshot) ??
      this.asRecord(applicationRecord?.contract_snapshot);
    return this.firstAmountFrom(contractSnapshot, amountKeys);
  }

  private walletAmountFromApproval(rawAmount: number, data: Record<string, unknown>): number {
    const direction = this.firstStringFrom(data, [
      'walletTransactionType',
      'wallet_transaction_type',
      'transactionType',
      'transaction_type',
      'walletAction',
      'wallet_action'
    ])?.toLowerCase();
    const magnitude = Math.abs(rawAmount);
    if (rawAmount < 0 || direction === 'debit' || direction === 'deduct') {
      return -magnitude;
    }
    return magnitude;
  }

  private approvalUpstreamAccountFrom(
    application: IProductApplicationDocument,
    data: Record<string, unknown>,
    applicationRecord: Record<string, unknown> | null
  ):
    | {
        accountNumber?: string;
        bankName?: string;
        bankCode?: string;
        providerReference?: string;
        accountType?: 'static' | 'reserved' | 'dynamic';
        provisionStatus?: 'active' | 'failed';
        provisionError?: string;
        provisionedAt?: string;
      }
    | undefined {
    const accountRecord =
      this.asRecord(data.upstreamAccount) ??
      this.asRecord(data.upstream_account) ??
      this.asRecord(data.bankAccount) ??
      this.asRecord(data.bank_account) ??
      this.asRecord(data.wallet) ??
      this.asRecord(applicationRecord?.upstreamAccount) ??
      this.asRecord(applicationRecord?.upstream_account) ??
      this.asRecord(applicationRecord?.bankAccount) ??
      this.asRecord(applicationRecord?.bank_account) ??
      this.asRecord(application.productWallet?.upstreamAccount);

    if (!accountRecord) {
      return undefined;
    }

    const accountNumber = this.firstStringFrom(accountRecord, [
      'accountNumber',
      'account_number',
      'payonusNubanAccountNumber',
      'payonus_nuban_account_number'
    ]);
    if (!accountNumber) {
      return undefined;
    }

    const accountType = this.firstStringFrom(accountRecord, ['accountType', 'account_type'])?.toLowerCase();
    const provisionStatus = this.firstStringFrom(accountRecord, [
      'provisionStatus',
      'provision_status',
      'status'
    ])?.toLowerCase();

    return {
      accountNumber,
      bankName: this.firstStringFrom(accountRecord, ['bankName', 'bank_name']),
      bankCode: this.firstStringFrom(accountRecord, ['bankCode', 'bank_code']),
      providerReference: this.firstStringFrom(accountRecord, [
        'providerReference',
        'provider_reference',
        'walletId',
        'wallet_id',
        'id'
      ]),
      accountType:
        accountType === 'static' || accountType === 'reserved' || accountType === 'dynamic'
          ? accountType
          : 'reserved',
      provisionStatus: provisionStatus === 'failed' ? 'failed' : 'active',
      provisionError: this.firstStringFrom(accountRecord, ['provisionError', 'provision_error', 'error']),
      provisionedAt: this.firstStringFrom(accountRecord, ['provisionedAt', 'provisioned_at', 'createdAt', 'created_at'])
    };
  }

  private async collectLendingSettlementOnApproval(
    application: IProductApplicationDocument,
    approvedAmount: number,
    eventId: string | undefined
  ): Promise<void> {
    const merchantId = application.merchantId?.trim();
    if (!merchantId) return;

    const applicationId = application._id.toString();
    const referenceId = eventId
      ? `settlement:lending:${applicationId}:${eventId}`
      : `settlement:lending:${applicationId}:approved`;
    const snapshot = this.contractSnapshotOf(application);
    const productType = String(application.productType || '').toUpperCase();

    try {
      if (productType === 'LOAN') {
        const equity = resolveEquityContributionFromSnapshot(snapshot);
        if (equity == null || equity <= 0) {
          // No-equity loans: LOAN_CHARGE is collected when the borrower transfers to PRIMARY.
          return;
        }
        const result = await collectLoanCharge({
          merchantId,
          appId: application.appId,
          userId: application.userId,
          productId: application.productId,
          applicationId,
          loanPrincipal: approvedAmount,
          currency: application.currency,
          referenceId,
          contractSnapshot: snapshot,
          debitUserWallet: false
        });
        if (!result.success && !result.skipped) {
          console.warn('Loan settlement charge failed', { applicationId, error: result.error });
        }
        return;
      }

      if (productType === 'MORTGAGE') {
        const equity = resolveEquityContributionFromSnapshot(snapshot);
        if (equity == null || equity <= 0) {
          // No-equity mortgages: MORTGAGE_CHARGE is collected when the borrower transfers to PRIMARY.
          return;
        }
        const result = await collectMortgageCharge({
          merchantId,
          appId: application.appId,
          userId: application.userId,
          productId: application.productId,
          applicationId,
          mortgagePrincipal: approvedAmount,
          currency: application.currency,
          referenceId,
          contractSnapshot: snapshot,
          debitUserWallet: false
        });
        if (!result.success && !result.skipped) {
          console.warn('Mortgage settlement charge failed', { applicationId, error: result.error });
        }
      }
    } catch (error) {
      console.error('Error collecting lending settlement charge', { error, applicationId });
    }
  }

  private async applyApprovedAmountToWallet(
    application: IProductApplicationDocument,
    approvedAmount: number,
    walletAmount: number,
    eventId: string | undefined,
    upstreamApplicationId: string | undefined,
    eventAt: Date,
    upstreamAccount:
      | {
          accountNumber?: string;
          bankName?: string;
          bankCode?: string;
          providerReference?: string;
          accountType?: 'static' | 'reserved' | 'dynamic';
          provisionStatus?: 'active' | 'failed';
          provisionError?: string;
          provisionedAt?: string;
        }
      | undefined
  ): Promise<{ wallet?: unknown; transaction?: unknown; duplicate?: boolean }> {
    const referenceId =
      eventId ||
      upstreamApplicationId ||
      `plata-loan-approval:${application._id.toString()}:${eventAt.toISOString()}`;

    return walletService.applyProductApplicationApproval({
      userId: application.userId,
      applicationId: application._id.toString(),
      merchantId: application.merchantId || '',
      productId: application.productId,
      productName: application.productName,
      productType: application.productType,
      appId: application.appId,
      amount: walletAmount,
      currency: application.currency,
      referenceId,
      description:
        walletAmount >= 0
          ? `Loan application approved: ${application.productName}`
          : `Loan application approval debit: ${application.productName}`,
      metadata: {
        approvedAmount,
        walletAmount,
        productId: application.productId,
        productName: application.productName,
        productType: application.productType,
        merchantId: application.merchantId,
        upstreamApplicationId,
        upstreamAccount,
        eventId,
        eventAt: eventAt.toISOString()
      },
      upstreamAccount
    });
  }

  private requirementKey(item: RequirementItem, index: number): string {
    return String(item.id ?? item.requirementType ?? item.description ?? index).trim();
  }

  private downloadableDocumentKey(item: DownloadableDocumentItem, index: number): string {
    return String(item.id ?? item.name ?? index).trim();
  }

  private submissionKeys(submission: ProductRequirementSubmission): string[] {
    return [submission.requirementId, submission.requirementType, submission.label]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());
  }

  private validateRequirementSubmissions(
    requirements: LoanRequirements | undefined,
    submissions: ProductRequirementSubmission[]
  ): void {
    const otherRequirements = requirements?.otherRequirements;
    const missing: string[] = [];
    if (Array.isArray(otherRequirements)) {
      for (const [index, requirement] of otherRequirements.entries()) {
        const item = requirement as RequirementItem;
        const key = this.requirementKey(item, index);
        const needsSubmission = item.uploadRequired === true || item.required === true;
        if (!needsSubmission) {
          continue;
        }

        const matchingSubmission = submissions.find((submission) =>
          this.submissionKeys(submission).includes(key)
        );
        if (!matchingSubmission) {
          missing.push(key);
          continue;
        }

        const contentType = String(item.contentType || '').trim().toLowerCase();
        const expectsUpload =
          item.uploadRequired === true ||
          contentType === 'document' ||
          contentType === 'document_upload';
        if (expectsUpload && !matchingSubmission.fileUrl) {
          missing.push(`${key} fileUrl`);
        }
      }
    }

    const downloadableDocuments = requirements?.documentsToDownload;
    if (Array.isArray(downloadableDocuments)) {
      for (const [index, document] of downloadableDocuments.entries()) {
        const item = document as DownloadableDocumentItem;
        const key = this.downloadableDocumentKey(item, index);
        if (!key) {
          continue;
        }

        const matchingSubmission = submissions.find((submission) =>
          this.submissionKeys(submission).includes(key)
        );
        if (!matchingSubmission) {
          missing.push(key);
          continue;
        }

        if (!matchingSubmission.fileUrl) {
          missing.push(`${key} fileUrl`);
        }
      }
    }

    if (missing.length > 0) {
      throw new ApiError(400, `Missing required product requirement submissions: ${missing.join(', ')}`);
    }
  }

  private contractSnapshotOf(application: IProductApplicationDocument): Record<string, unknown> {
    return application.contractSnapshot && typeof application.contractSnapshot === 'object'
      ? (application.contractSnapshot as Record<string, unknown>)
      : {};
  }

  private mortgageEquitySnapshotFields(product: Product): Record<string, unknown> {
    if (String(product.type).toUpperCase() !== 'MORTGAGE') {
      return {};
    }

    const productRecord = product as Product & { calculatedConfig?: { mortgage?: Record<string, unknown> } };
    return {
      ...(product.equityContribution != null ? { equityContribution: product.equityContribution } : {}),
      ...(product.propertyValue != null ? { propertyValue: product.propertyValue } : {}),
      ...(Array.isArray(product.properties) && product.properties.length > 0
        ? { properties: product.properties }
        : {}),
      ...(productRecord.calculatedConfig?.mortgage
        ? { calculatedConfig: { mortgage: productRecord.calculatedConfig.mortgage } }
        : {})
    };
  }

  /** Per-unit price for a commodity: `structure.unitAmount` (number/string, or `{ amount }`) → fallback `product.price`. */
  private commodityUnitPrice(product: Product): number | undefined {
    const unitAmount = product.structure?.unitAmount as
      | number
      | string
      | { amount?: number | string }
      | undefined;
    let unitPrice: number | undefined;
    if (unitAmount !== null && typeof unitAmount === 'object') {
      unitPrice = this.parseFiniteAmount(unitAmount.amount);
    } else {
      unitPrice = this.parseFiniteAmount(unitAmount);
    }
    if (unitPrice === undefined) {
      unitPrice = this.parseFiniteAmount(product.price);
    }
    return unitPrice !== undefined && unitPrice > 0 ? unitPrice : undefined;
  }

  /** Minimum purchasable units: `structure.minQuantityPurchase` → `product.minimumQuantity` → 1. */
  private commodityMinQuantity(product: Product): number {
    const min =
      this.parseFiniteAmount(product.structure?.minQuantityPurchase) ??
      this.parseFiniteAmount(product.minimumQuantity) ??
      1;
    return min >= 1 ? Math.floor(min) : 1;
  }

  /**
   * For COMMODITY products the charged amount is server-derived as `unitPrice × quantity`
   * (the client-sent `amount` is ignored). Returns `null` for non-commodity products so callers
   * keep using the client `amount`. Throws on an unpriced commodity or an invalid/too-small quantity.
   */
  private resolveCommodityPurchase(
    input: CreateProductApplicationRequest,
    product: Product
  ): { amount: number; selection: Record<string, unknown> } | null {
    if (String(product.type).toUpperCase() !== 'COMMODITY') {
      return null;
    }

    const unitPrice = this.commodityUnitPrice(product);
    if (unitPrice === undefined) {
      throw new ApiError(422, 'This commodity does not have a unit price configured');
    }

    const minQuantity = this.commodityMinQuantity(product);
    const quantity = input.quantity ?? minQuantity;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, 'quantity must be a positive integer');
    }
    if (quantity < minQuantity) {
      throw new ApiError(400, `Quantity must be at least ${minQuantity} for this commodity`);
    }

    const total = Math.round(unitPrice * quantity * 100) / 100;
    return {
      amount: total,
      selection: {
        unitPrice,
        quantity,
        total,
        ...(product.unitOfMeasure ? { unitOfMeasure: product.unitOfMeasure } : {})
      }
    };
  }

  private guarantorsFrom(application: IProductApplicationDocument): ApplicationGuarantor[] {
    const snapshot = this.contractSnapshotOf(application);
    return Array.isArray(snapshot.guarantors) ? (snapshot.guarantors as ApplicationGuarantor[]) : [];
  }

  private validateGuarantorRequirement(
    product: Product,
    application: IProductApplicationDocument
  ): void {
    if (product.requirements?.security?.guarantor !== true) {
      return;
    }

    const guarantors = this.guarantorsFrom(application);
    if (guarantors.length === 0) {
      throw new ApiError(400, 'At least one guarantor is required for this product');
    }
  }

  private async resolveLoanProduct(input: CreateProductApplicationRequest): Promise<Product> {
    const productDoc = await ProductModel.findById(input.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const normalizedType = String(product.type || '').trim().toUpperCase();
    if (normalizedType !== 'LOAN' && normalizedType !== 'MORTGAGE') {
      if (normalizedType === 'COMMODITY') {
        throw new ApiError(
          400,
          'Commodity products must use POST /api/v1/commodity-accounts/apply (crowdfunding enrollment with immediate funding)'
        );
      }
      if (normalizedType === 'INVESTMENT') {
        throw new ApiError(
          400,
          'Investment products must use POST /api/v1/investment-accounts (provision) then POST /api/v1/investment-accounts/:id/deposits (fund)'
        );
      }
      if (normalizedType === 'SAVINGS') {
        throw new ApiError(
          400,
          'Savings products must use POST /api/v1/savings-accounts (provision) then POST /api/v1/savings-accounts/:id/deposits (fund)'
        );
      }
      throw new ApiError(400, 'Only loan and mortgage products can create product applications');
    }

    if (product.isActive !== true || !product.appId) {
      throw new ApiError(403, 'Product is not active for this app. Only active products can be applied for.');
    }

    if (input.appId && input.appId !== product.appId) {
      throw new ApiError(400, 'Application appId does not match product appId');
    }

    if (!input.merchantId) {
      throw new ApiError(400, 'merchantId is required for loan and mortgage applications');
    }

    return product;
  }

  private async withComplianceBvn(input: CreateProductApplicationRequest): Promise<CreateProductApplicationRequest> {
    const bvn = await complianceBvnService.resolveUserBvn(input.userId);
    if (!bvn) {
      throw new ApiError(400, 'BVN is required. Complete Fuspay KYC first.');
    }
    return { ...input, bvn };
  }

  private async withApplicantName(
    input: CreateProductApplicationRequest,
    authorizationHeader?: string
  ): Promise<CreateProductApplicationRequest> {
    if (input.applicantName?.trim()) {
      return { ...input, applicantName: input.applicantName.trim() };
    }

    const applicantName = await clientAuthUserService.resolveApplicantName(
      input.userId,
      authorizationHeader,
      input.email
    );

    return applicantName ? { ...input, applicantName } : input;
  }

  private async withUserPhone(
    input: CreateProductApplicationRequest,
    authorizationHeader?: string
  ): Promise<CreateProductApplicationRequest> {
    const phone = input.phone?.trim();
    if (phone) {
      return { ...input, phone };
    }

    const resolvedPhone = await clientAuthUserService.resolveUserPhone(input.userId, authorizationHeader);
    if (!resolvedPhone) {
      throw new ApiError(400, 'Phone number is required. Update your profile phone number first.');
    }

    return { ...input, phone: resolvedPhone };
  }

  private async resolveOfferingMerchantDisplayName(
    input: Pick<CreateProductApplicationRequest, 'merchantId' | 'offeringMerchantName'>,
    product: Product
  ): Promise<string | undefined> {
    return merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: input.merchantId,
      appId: product.appId,
      fallback: input.offeringMerchantName
    });
  }

  private async createApplicationRecord(
    input: CreateProductApplicationRequest,
    product: Product,
    requirementSubmissions: ProductRequirementSubmission[],
    loanWorkflowStatus: string,
    offeringMerchantName?: string,
    commoditySelection?: Record<string, unknown>
  ): Promise<IProductApplicationDocument> {
    const resolvedOfferingMerchantName =
      offeringMerchantName ??
      (await this.resolveOfferingMerchantDisplayName(input, product));
    return ProductApplicationModel.create({
      userId: input.userId,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      status: 'PENDING',
      appId: product.appId,
      merchantId: input.merchantId,
      requirementsSnapshot: product.requirements,
      contractSnapshot: {
        amount: input.amount,
        currency: input.currency,
        productId: product.id,
        productName: product.name,
        productType: product.type,
        structure: product.structure,
        requirements: product.requirements,
        applicantName: input.applicantName?.trim() || input.userId,
        ...(resolvedOfferingMerchantName ? { offeringMerchantName: resolvedOfferingMerchantName } : {}),
        ...this.mortgageEquitySnapshotFields(product),
        ...(commoditySelection ? { commoditySelection } : {})
      },
      loanWorkflowStatus,
      requirementSubmissions
    });
  }

  private persistDraftPlatformFields(
    application: IProductApplicationDocument,
    input: PlatformApplicationFieldInput & { metadata?: Record<string, unknown> },
    productType: string
  ): void {
    const fieldInput = extractPlatformFieldInput(input);
    if (!hasPlatformFieldInput(fieldInput)) {
      return;
    }

    const merged = mergePlatformFieldInput(platformFieldsFromApplication(application), fieldInput);
    const validated = validatePlatformApplicationFields({
      ...merged,
      status: 'draft',
      productType
    });
    applyPlatformFieldsToApplication(application, validated);
  }

  private resolveSubmittedPlatformFields(
    application: IProductApplicationDocument,
    input: PlatformApplicationFieldInput & { metadata?: Record<string, unknown> },
    productType: string
  ): ValidatedPlatformApplicationFields {
    const fieldInput = extractPlatformFieldInput(input);
    const merged = mergePlatformFieldInput(platformFieldsFromApplication(application), fieldInput);
    return validatePlatformApplicationFields({
      ...merged,
      status: 'submitted',
      productType
    });
  }

  private async findInitializedApplication(
    input: CreateProductApplicationRequest,
    product: Product
  ): Promise<IProductApplicationDocument | null> {
    return ProductApplicationModel.findOne({
      userId: input.userId,
      productId: product.id,
      appId: product.appId,
      merchantId: input.merchantId,
      status: 'PENDING',
      'productWallet.upstreamAccount.accountNumber': { $exists: true, $nin: ['', null] }
    }).sort({ updatedAt: -1 }).exec();
  }

  private accountCreatedNotificationDetail(application: IProductApplicationDocument): string {
    const account = application.productWallet?.upstreamAccount;
    if (!account?.accountNumber?.trim()) {
      return '';
    }
    const bankSuffix = account.bankName?.trim() ? ` (${account.bankName.trim()})` : '';
    return `Your account number is ${account.accountNumber.trim()}${bankSuffix}.`;
  }

  private async notifyAccountCreatedIfNeeded(
    application: IProductApplicationDocument,
    previousWorkflowStage: string | undefined,
    product?: Product
  ): Promise<void> {
    if (application.loanWorkflowStatus !== 'account_created' || previousWorkflowStage === 'account_created') {
      return;
    }
    void this.notifyWorkflowStageChanged(
      application,
      'account_created',
      previousWorkflowStage,
      product,
      this.accountCreatedNotificationDetail(application)
    );
  }

  private async provisionProductWallet(
    application: IProductApplicationDocument,
    input: CreateProductApplicationRequest,
    product: Product
  ): Promise<void> {
    const merchantId = input.merchantId;
    if (!merchantId) {
      throw new ApiError(400, 'merchantId is required for loan and mortgage applications');
    }

    try {
      const previousWorkflowStage = application.loanWorkflowStatus;
      const productWallet = await walletService.ensureProductWallet({
        userId: input.userId,
        merchantId,
        applicationId: application._id.toString(),
        productId: product.id,
        productName: product.name,
        productType: product.type,
        appId: product.appId,
        currency: input.currency
      });

      application.productWallet = {
        walletId: productWallet.wallet.id,
        walletPurpose: productWallet.wallet.walletPurpose,
        reusedUpstreamAccount: productWallet.reusedUpstreamAccount,
        upstreamAccount: {
          accountNumber: productWallet.wallet.virtualNuban?.accountNumber,
          bankName: productWallet.wallet.virtualNuban?.bankName,
          bankCode: productWallet.wallet.virtualNuban?.bankCode,
          providerReference: productWallet.wallet.virtualNuban?.providerReference,
          provisionStatus: productWallet.wallet.virtualNuban?.provisionStatus,
          provisionError: productWallet.wallet.virtualNuban?.provisionError
        }
      };
      application.loanWorkflowStatus = 'account_created';
      await application.save();
      void this.notifyAccountCreatedIfNeeded(application, previousWorkflowStage, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product wallet';
      throw new ApiError(502, `Application created, but product wallet provisioning failed: ${message}`);
    }
  }

  private async syncUpstreamApplication(
    application: IProductApplicationDocument,
    input: CreateProductApplicationRequest,
    product: Product,
    requirementSubmissions: ProductRequirementSubmission[],
    options: { requireUpstreamAccount?: boolean; tolerateAccountProvisioningFailure?: boolean } = {}
  ): Promise<void> {
    const merchantId = input.merchantId;
    if (!merchantId) {
      throw new ApiError(400, 'merchantId is required for loan and mortgage applications');
    }

    try {
      const previousWorkflowStage = application.loanWorkflowStatus;
      const offeringMerchantName = await this.resolveOfferingMerchantDisplayName(input, product);
      const upstream = await upstreamApplicationService.submitExternalApplication({
        localApplicationId: application._id.toString(),
        localAppId: product.appId,
        integratorMerchantId: input.integratorMerchantId?.trim() || '',
        integratorMerchantName: input.integratorMerchantName?.trim(),
        offeringMerchantId: merchantId,
        offeringMerchantName,
        product,
        userId: input.userId,
        applicantName: input.applicantName,
        email: input.email,
        phone: input.phone,
        bvn: input.bvn,
        country: input.country,
        amount: input.amount,
        currency: input.currency,
        requirementSubmissions,
        subMerchant: input.subMerchant,
        subMerchantContactEmail: input.subMerchantContactEmail,
        subMerchantContactPhone: input.subMerchantContactPhone,
        productCreatorMerchantName: input.productCreatorMerchantName
      });

      if (upstream.upstreamApplicationId) {
        application.upstreamApplicationId = upstream.upstreamApplicationId;
        application.upstreamSyncError = undefined;
        application.loanWorkflowStatus = 'upstream_synced';
      }

      if (upstream.upstreamAccount) {
        application.productWallet = {
          walletId:
            upstream.upstreamAccount.providerReference ||
            upstream.upstreamApplicationId ||
            `plata:${application._id.toString()}`,
          walletPurpose: 'PLATA_PRODUCT_APPLICATION',
          reusedUpstreamAccount: false,
          upstreamAccount: upstream.upstreamAccount
        };
        application.loanWorkflowStatus = upstream.upstreamAccount.accountNumber
          ? 'account_created'
          : application.loanWorkflowStatus;
        if (!upstream.upstreamAccount.accountNumber && upstream.upstreamAccount.provisionError) {
          application.upstreamSyncError = upstream.upstreamAccount.provisionError;
        }
      }

      if (upstream.skipReason) {
        if (options.requireUpstreamAccount) {
          throw new ApiError(502, `Plata account provisioning skipped: ${upstream.skipReason}`);
        }
        application.upstreamSyncError = upstream.skipReason;
        await application.save();
        console.warn('Upstream external-accounts skipped:', upstream.skipReason);
        return;
      }

      if (
        options.requireUpstreamAccount &&
        !upstream.upstreamAccount?.accountNumber &&
        !this.canContinueAfterAccountProvisioningFailure(upstream.upstreamAccount, options)
      ) {
        throw new ApiError(502, 'Plata did not return a created account number');
      }

      await application.save();
      void this.notifyAccountCreatedIfNeeded(application, previousWorkflowStage, product);
    } catch (error) {
      if (error instanceof ApiError) {
        application.upstreamSyncError = error.message;
        await application.save();
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Upstream sync failed';
      application.upstreamSyncError = message;
      await application.save();
      if (options.tolerateAccountProvisioningFailure && this.isExistingAccountProvisioningMessage(message)) {
        return;
      }
      throw new ApiError(502, `Application saved locally, but upstream Plata sync failed: ${message}`);
    }
  }

  async handleGuarantorKycCompleted(
    applicationId: string,
    guarantorId: string
  ): Promise<{ notified: boolean; duplicate: boolean }> {
    if (!guarantorId?.trim()) {
      throw new ApiError(400, 'guarantorId is required');
    }

    const application = await this.resolveApplicationForGuarantorKycCompletion(applicationId);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    return this.handleGuarantorKycCompletedOnDocument(application, guarantorId.trim());
  }

  private async resolveApplicationForGuarantorKycCompletion(
    applicationId: string
  ): Promise<IProductApplicationDocument | null> {
    if (mongoose.isValidObjectId(applicationId)) {
      const byLocalId = await ProductApplicationModel.findById(applicationId);
      if (byLocalId) {
        return byLocalId;
      }
    }

    return ProductApplicationModel.findOne({ upstreamApplicationId: applicationId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  private async handleGuarantorKycCompletedOnDocument(
    application: IProductApplicationDocument,
    guarantorId: string
  ): Promise<{ notified: boolean; duplicate: boolean }> {
    const applicationId = application._id.toString();
    const guarantors = this.guarantorsFrom(application);
    const index = guarantors.findIndex((item) => item.id === guarantorId);
    if (index < 0) {
      throw new ApiError(404, 'Guarantor not found on application');
    }

    const guarantor = guarantors[index];
    const priorStatus = String(guarantor.kyc?.status ?? '').toLowerCase();
    if (['approved', 'completed', 'verified', 'success'].includes(priorStatus)) {
      return { notified: false, duplicate: true };
    }

    const now = new Date().toISOString();
    guarantors[index] = {
      ...guarantor,
      kyc: {
        ...guarantor.kyc,
        userRef: guarantor.kyc?.userRef || `guarantor_${applicationId}_${guarantorId}`,
        status: 'approved'
      },
      updatedAt: now
    };

    const snapshot = this.contractSnapshotOf(application);
    application.contractSnapshot = {
      ...snapshot,
      guarantors
    };
    await application.save();

    const productDoc = await ProductModel.findById(application.productId);
    const product = productDoc ? toProduct(productDoc) : undefined;
    const merchantOwner = application.merchantId
      ? await clientAuthUserService.resolveMerchantOwner(application.merchantId)
      : undefined;

    void sendGuarantorKycApprovedNotification({
      userId: application.userId,
      ...(application.email ? { email: application.email } : {}),
      applicantName: this.applicantNameFrom(application),
      guarantorName: guarantor.fullName,
      productName: application.productName,
      productType: application.productType,
      applicationId: application._id.toString(),
      merchantName: await this.offeringMerchantNameFrom(application, product),
      ...(merchantOwner ? { merchantOwner } : {})
    });

    return { notified: true, duplicate: false };
  }

  private canContinueAfterAccountProvisioningFailure(
    upstreamAccount: { provisionStatus?: string; provisionError?: string } | undefined,
    options: { tolerateAccountProvisioningFailure?: boolean }
  ): boolean {
    if (!options.tolerateAccountProvisioningFailure || !upstreamAccount) {
      return false;
    }

    const provisionStatus = upstreamAccount.provisionStatus?.trim().toLowerCase();
    const provisionError = upstreamAccount.provisionError?.trim();
    return provisionStatus === 'failed' || this.isExistingAccountProvisioningMessage(provisionError);
  }

  private isExistingAccountProvisioningMessage(message: string | undefined): boolean {
    const normalized = message?.trim().toLowerCase() || '';
    return (
      normalized.includes('already generated') ||
      normalized.includes('already exists') ||
      normalized.includes('existing fixed virtual account')
    );
  }

  private async syncFinalApplicationToUpstream(
    application: IProductApplicationDocument,
    product: Product,
    contractSnapshot: Record<string, unknown>,
    requirementSubmissions: ProductRequirementSubmission[],
    submittedAt: string
  ): Promise<void> {
    const merchantId = application.merchantId?.trim();
    if (!merchantId) {
      throw new ApiError(400, 'merchantId is required to submit loan and mortgage applications upstream');
    }

    if (application.loanWorkflowStatus === 'under_review' && application.upstreamApplicationId && !application.upstreamSyncError) {
      return;
    }

    try {
      const inputWithPhone = await this.withUserPhone({
        userId: application.userId,
        productId: application.productId,
        amount: application.amount,
        currency: application.currency,
        merchantId
      });
      const inputWithComplianceBvn = await this.withComplianceBvn(inputWithPhone);
      const offeringMerchantName = await this.offeringMerchantNameFrom(application, product);
      let applicantProfileSnapshot: Record<string, unknown> | undefined;
      try {
        applicantProfileSnapshot = (await applicantProfileService.buildApplicantProfileForUpstreamSync(
          application._id.toString()
        )) as unknown as Record<string, unknown>;
      } catch (profileError) {
        console.warn('[product-ms] Applicant profile snapshot build failed (continuing upstream submit):', profileError);
      }
      const upstream = await upstreamApplicationService.submitFinalApplication({
        localApplicationId: application._id.toString(),
        product,
        userId: application.userId,
        applicantName: this.applicantNameFrom(application),
        email: application.email || `${application.userId}@spring.local`,
        phone: inputWithComplianceBvn.phone || '',
        bvn: inputWithComplianceBvn.bvn || '',
        offeringMerchantId: merchantId,
        offeringMerchantName,
        contractSnapshot,
        requirementSubmissions,
        submittedAt,
        platformFields: platformFieldsFromApplication(application),
        ...(applicantProfileSnapshot ? { applicantProfileSnapshot } : {})
      });

      if (upstream.skipReason) {
        throw new ApiError(502, `Application saved locally, but upstream Plata final submit failed: ${upstream.skipReason}`);
      }

      if (upstream.upstreamApplicationId) {
        application.upstreamApplicationId = upstream.upstreamApplicationId;
        await this.syncGuarantorKycLinks(application, upstream.upstreamApplicationId);
      }
      application.upstreamSyncError = undefined;
    } catch (error) {
      if (error instanceof ApiError) {
        application.upstreamSyncError = error.message;
        await application.save();
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Upstream final submit failed';
      application.upstreamSyncError = message;
      await application.save();
      throw new ApiError(502, `Application saved locally, but upstream Plata final submit failed: ${message}`);
    }
  }

  private async syncGuarantorKycLinks(
    application: IProductApplicationDocument,
    upstreamApplicationId: string
  ): Promise<void> {
    const guarantors = this.guarantorsFrom(application);
    if (guarantors.length === 0) {
      return;
    }

    const updatedGuarantors: ApplicationGuarantor[] = [];
    for (const guarantor of guarantors) {
      if (guarantor.kyc?.verificationUrl) {
        updatedGuarantors.push(guarantor);
        continue;
      }

      const upstreamGuarantor = await upstreamApplicationService.createGuarantorKyc(upstreamApplicationId, {
        guarantorId: guarantor.id,
        fullName: guarantor.fullName,
        email: guarantor.email,
        phone: guarantor.phone,
        occupation: guarantor.occupation,
        relationship: guarantor.relationship,
        country: guarantor.country
      });

      updatedGuarantors.push({
        ...guarantor,
        kyc: {
          userRef: guarantor.kyc?.userRef || `guarantor_${application._id.toString()}_${guarantor.id}`,
          verificationId: upstreamGuarantor.providerReference,
          verificationUrl: upstreamGuarantor.verificationUrl,
          status: upstreamGuarantor.status || 'pending',
          reference: upstreamGuarantor.providerReference,
          raw: upstreamGuarantor.raw
        },
        updatedAt: new Date().toISOString()
      });
    }

    application.contractSnapshot = {
      ...this.contractSnapshotOf(application),
      guarantors: updatedGuarantors
    };
  }

  private async ensureUpstreamApplicationForGuarantor(
    application: IProductApplicationDocument,
    product: Product
  ): Promise<string> {
    if (application.upstreamApplicationId) {
      return application.upstreamApplicationId;
    }

    const merchantId = application.merchantId?.trim();
    if (!merchantId) {
      throw new ApiError(400, 'merchantId is required to create guarantor KYC upstream');
    }

    const inputWithPhone = await this.withUserPhone({
      userId: application.userId,
      productId: application.productId,
      amount: application.amount,
      currency: application.currency,
      email: application.email || `${application.userId}@spring.local`,
      merchantId,
      appId: application.appId,
      applicantName: this.applicantNameFrom(application)
    });
    const inputWithComplianceBvn = await this.withComplianceBvn(inputWithPhone);
    const offeringMerchantName = await this.offeringMerchantNameFrom(application, product);
    const upstream = await upstreamApplicationService.resolveUpstreamApplicationForGuarantor({
      localApplicationId: application._id.toString(),
      product,
      userId: application.userId,
      applicantName: this.applicantNameFrom(application),
      email: inputWithComplianceBvn.email || `${application.userId}@spring.local`,
      phone: inputWithComplianceBvn.phone || '',
      bvn: inputWithComplianceBvn.bvn || '',
      offeringMerchantId: merchantId,
      offeringMerchantName,
      country: inputWithComplianceBvn.country,
      amount: application.amount,
      currency: application.currency
    });

    application.upstreamApplicationId = upstream.upstreamApplicationId;
    application.upstreamSyncError = undefined;

    await application.save();
    return upstream.upstreamApplicationId;
  }

  private applicantNameFrom(application: IProductApplicationDocument): string {
    const snapshot = this.contractSnapshotOf(application);
    const applicant = snapshot.applicant as Record<string, unknown> | undefined;
    const applicantName =
      (typeof applicant?.name === 'string' && applicant.name.trim()) ||
      (typeof snapshot.applicantName === 'string' && snapshot.applicantName.trim()) ||
      (typeof application.email === 'string' && application.email.split('@')[0].replace(/[._+-]+/g, ' ').trim()) ||
      application.userId;
    return applicantName;
  }

  private async notifyWorkflowStageChanged(
    application: IProductApplicationDocument,
    workflowStage: string,
    previousWorkflowStage?: string,
    product?: Product,
    detail?: string
  ): Promise<void> {
    try {
      const merchantOwner = application.merchantId
        ? await clientAuthUserService.resolveMerchantOwner(application.merchantId)
        : undefined;
      const merchantDisplay = await this.applicationMerchantDisplayFrom(application, product);
      await sendProductApplicationWorkflowStageNotification({
        userId: application.userId,
        ...(application.email ? { email: application.email } : {}),
        applicantName: this.applicantNameFrom(application),
        productName: application.productName,
        productType: application.productType,
        applicationId: application._id.toString(),
        workflowStage,
        ...(previousWorkflowStage ? { previousWorkflowStage } : {}),
        amount: application.amount,
        currency: application.currency,
        merchantName: merchantDisplay.merchantName,
        poweredBy: merchantDisplay.poweredBy,
        ...(merchantOwner ? { merchantOwner } : {}),
        ...(detail ? { detail } : {}),
        contractSnapshot: application.contractSnapshot as Record<string, unknown> | undefined
      });
    } catch (error) {
      console.error('[product-ms] Failed to send product application workflow notification:', error);
    }
  }

  private async offeringMerchantNameFrom(
    application: IProductApplicationDocument,
    product?: Product
  ): Promise<string | undefined> {
    const snapshot = this.contractSnapshotOf(application);
    const snapshotName =
      typeof snapshot.offeringMerchantName === 'string' && snapshot.offeringMerchantName.trim()
        ? snapshot.offeringMerchantName.trim()
        : undefined;
    return merchantDisplayNameService.resolveOfferingMerchantName({
      merchantId: application.merchantId,
      appId: application.appId || product?.appId,
      fallback: snapshotName
    });
  }

  private async productCreatorDisplayFrom(product?: Product) {
    return merchantDisplayNameService.resolveProductCreatorDisplay(product);
  }

  private async resolveProductForApplication(
    application: IProductApplicationDocument,
    product?: Product
  ): Promise<Product | undefined> {
    if (product) {
      return product;
    }
    const productDoc = await ProductModel.findById(application.productId);
    return productDoc ? toProduct(productDoc) : undefined;
  }

  private async applicationMerchantDisplayFrom(
    application: IProductApplicationDocument,
    product?: Product
  ) {
    const resolvedProduct = await this.resolveProductForApplication(application, product);
    const productCreatorDisplay = await this.productCreatorDisplayFrom(resolvedProduct);
    const offeringMerchantName = await this.offeringMerchantNameFrom(application, resolvedProduct);
    return {
      merchantName: offeringMerchantName || productCreatorDisplay.merchantName,
      poweredBy: productCreatorDisplay.poweredBy
    };
  }

  private randomizeBvnLastThreeDigitsForUpstream(bvn: string | undefined): string | undefined {
    const digits = bvn?.replace(/\D/g, '') || '';
    if (digits.length !== 11) {
      return bvn;
    }

    const originalSuffix = digits.slice(-3);
    let randomSuffix = originalSuffix;
    while (randomSuffix === originalSuffix) {
      randomSuffix = randomInt(0, 1000).toString().padStart(3, '0');
    }

    return `${digits.slice(0, -3)}${randomSuffix}`;
  }

  async createApplication(
    input: CreateProductApplicationRequest,
    authorizationHeader?: string
  ): Promise<ProductApplication> {
    const product = await this.resolveLoanProduct(input);
    const inputWithApplicantName = await this.withApplicantName(input, authorizationHeader);
    const inputWithPhone = await this.withUserPhone(inputWithApplicantName, authorizationHeader);
    const inputWithComplianceBvn = await this.withComplianceBvn(inputWithPhone);
    const commodityPurchase = this.resolveCommodityPurchase(inputWithComplianceBvn, product);
    const resolvedInput = commodityPurchase
      ? { ...inputWithComplianceBvn, amount: commodityPurchase.amount, quantity: commodityPurchase.selection.quantity as number }
      : inputWithComplianceBvn;
    const requirementSubmissions = input.requirementSubmissions ?? [];
    this.validateRequirementSubmissions(product.requirements, requirementSubmissions);

    const application = await this.createApplicationRecord(
      resolvedInput,
      product,
      requirementSubmissions,
      'requested',
      undefined,
      commodityPurchase?.selection
    );
    this.persistDraftPlatformFields(application, resolvedInput, product.type);

    await this.provisionProductWallet(application, resolvedInput, product);
    await this.syncUpstreamApplication(application, resolvedInput, product, requirementSubmissions);

    if (requirementSubmissions.length > 0) {
      application.loanWorkflowStatus = 'requirements_submitted';
    }
    await application.save();

    const productCreatorDisplay = await this.productCreatorDisplayFrom(product);
    const offeringMerchantName = await this.offeringMerchantNameFrom(application, product);
    const merchantDisplay = {
      merchantName: offeringMerchantName || productCreatorDisplay.merchantName,
      poweredBy: productCreatorDisplay.poweredBy
    };

    void sendProductApplicationSubmittedNotification({
      userId: application.userId,
      ...(application.email ? { email: application.email } : {}),
      applicantName: this.applicantNameFrom(application),
      productName: application.productName,
      productType: application.productType,
      applicationId: application._id.toString(),
      amount: application.amount,
      currency: application.currency,
      merchantName: merchantDisplay.merchantName,
      poweredBy: merchantDisplay.poweredBy,
      contractSnapshot: application.contractSnapshot as Record<string, unknown> | undefined
    });

    return toProductApplication(application);
  }

  async initializeApplication(
    input: CreateProductApplicationRequest,
    authorizationHeader?: string
  ): Promise<{ application: ProductApplication; created: boolean }> {
    const product = await this.resolveLoanProduct(input);
    const initializedApplication = await this.findInitializedApplication(input, product);
    if (initializedApplication) {
      return {
        application: toProductApplication(initializedApplication),
        created: false
      };
    }

    const inputWithApplicantName = await this.withApplicantName(input, authorizationHeader);
    const inputWithPhone = await this.withUserPhone(inputWithApplicantName, authorizationHeader);
    const inputWithComplianceBvn = await this.withComplianceBvn(inputWithPhone);
    const commodityPurchase = this.resolveCommodityPurchase(inputWithComplianceBvn, product);
    const resolvedInput = commodityPurchase
      ? { ...inputWithComplianceBvn, amount: commodityPurchase.amount, quantity: commodityPurchase.selection.quantity as number }
      : inputWithComplianceBvn;
    const application = await this.createApplicationRecord(
      resolvedInput,
      product,
      [],
      'account_requested',
      undefined,
      commodityPurchase?.selection
    );
    this.persistDraftPlatformFields(application, resolvedInput, product.type);
    await application.save();

    const upstreamInitInput = {
      ...resolvedInput,
      bvn: this.randomizeBvnLastThreeDigitsForUpstream(resolvedInput.bvn)
    };

    await this.syncUpstreamApplication(application, upstreamInitInput, product, [], {
      requireUpstreamAccount: true,
      tolerateAccountProvisioningFailure: true
    });

    return {
      application: toProductApplication(application),
      created: true
    };
  }

  async submitRequirements(
    id: string,
    input: SubmitProductApplicationRequirementsRequest
  ): Promise<ProductApplication> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (input.userId && input.userId !== application.userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Cannot update requirements for ${application.status} application`);
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const requirementSubmissions = input.requirementSubmissions ?? [];
    this.validateRequirementSubmissions(product.requirements, requirementSubmissions);

    application.requirementSubmissions = requirementSubmissions;
    application.requirementsSnapshot = product.requirements;
    application.contractSnapshot = {
      ...(application.contractSnapshot as Record<string, unknown> | undefined),
      requirements: product.requirements,
      requirementSubmissions
    };
    application.loanWorkflowStatus = 'requirements_submitted';
    await application.save();

    return toProductApplication(application);
  }

  async saveProgress(
    id: string,
    input: SaveProductApplicationProgressRequest
  ): Promise<ProductApplication> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (input.userId && input.userId !== application.userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Cannot save progress for ${application.status} application`);
    }

    const existingProgress = application.applicationProgress ?? {};
    const progressMetadata =
      input.metadata !== undefined
        ? {
            ...(existingProgress.metadata as Record<string, unknown> | undefined),
            ...input.metadata
          }
        : existingProgress.metadata;
    application.applicationProgress = {
      ...existingProgress,
      ...(input.currentStep !== undefined ? { currentStep: input.currentStep } : {}),
      ...(input.currentTab !== undefined ? { currentTab: input.currentTab } : {}),
      ...(input.requirementDrafts !== undefined ? { requirementDrafts: input.requirementDrafts } : {}),
      ...(input.uploadedDrafts !== undefined ? { uploadedDrafts: input.uploadedDrafts } : {}),
      ...(input.guarantorDrafts !== undefined ? { guarantorDrafts: input.guarantorDrafts } : {}),
      ...(progressMetadata !== undefined ? { metadata: progressMetadata } : {}),
      lastSavedAt: new Date()
    };

    this.persistDraftPlatformFields(application, input, application.productType);

    await application.save();

    return toProductApplication(application);
  }

  async createGuarantor(
    id: string,
    input: CreateApplicationGuarantorRequest
  ): Promise<{
    application: ProductApplication;
    guarantor: ApplicationGuarantor;
    guarantors: ApplicationGuarantor[];
    alreadyAdded: boolean;
  }> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (input.userId && input.userId !== application.userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Cannot add guarantor to ${application.status} application`);
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    if (product.requirements?.security?.guarantor !== true) {
      throw new ApiError(400, 'This product does not require guarantors');
    }

    const existingGuarantors = this.guarantorsFrom(application);
    const existingIndex = existingGuarantors.findIndex(
      (guarantor) => guarantor.email.toLowerCase() === input.email.trim().toLowerCase()
    );

    // Re-add / re-trigger same guarantor email: return existing list, do not recreate Fuspay KYC.
    if (existingIndex >= 0) {
      const existing = existingGuarantors[existingIndex];
      return {
        application: toProductApplication(application),
        guarantor: existing,
        guarantors: existingGuarantors,
        alreadyAdded: true
      };
    }

    if (existingGuarantors.length >= 2) {
      throw new ApiError(400, 'A maximum of 2 guarantors can be added');
    }

    const now = new Date().toISOString();
    const guarantorId = randomUUID();
    const upstreamApplicationId = await this.ensureUpstreamApplicationForGuarantor(application, product);
    let upstreamGuarantor: Awaited<ReturnType<typeof upstreamApplicationService.createGuarantorKyc>>;
    try {
      upstreamGuarantor = await upstreamApplicationService.createGuarantorKyc(upstreamApplicationId, {
        guarantorId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        occupation: input.occupation,
        relationship: input.relationship,
        country: input.country
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to create guarantor KYC link upstream';
      application.upstreamSyncError = message;
      await application.save();
      throw new ApiError(502, `Backend-platter guarantor KYC link creation failed: ${message}`);
    }

    const guarantor: ApplicationGuarantor = {
      id: guarantorId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      occupation: input.occupation,
      relationship: input.relationship,
      country: input.country || 'NG',
      kyc: {
        userRef: `guarantor_${application._id.toString()}_${guarantorId}`,
        verificationId: upstreamGuarantor.providerReference,
        verificationUrl: upstreamGuarantor.verificationUrl,
        status: upstreamGuarantor.status || 'pending',
        reference: upstreamGuarantor.providerReference,
        raw: upstreamGuarantor.raw
      },
      createdAt: now,
      updatedAt: now
    };

    const guarantors = [...existingGuarantors, guarantor];

    const snapshot = this.contractSnapshotOf(application);
    application.contractSnapshot = {
      ...snapshot,
      guarantors
    };
    application.loanWorkflowStatus = 'guarantor_kyc_requested';
    await application.save();

    return {
      application: toProductApplication(application),
      guarantor,
      guarantors,
      alreadyAdded: false
    };
  }

  async createSpouseKyc(
    id: string,
    input: CreateApplicationSpouseKycRequest
  ): Promise<{ application: ProductApplication; spouse: ApplicationSpouseKyc }> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (input.userId && input.userId !== application.userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Cannot start spouse KYC on ${application.status} application`);
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const productType = String(product.type || application.productType || '').toUpperCase();
    if (productType !== 'LOAN' && productType !== 'MORTGAGE') {
      throw new ApiError(400, 'Spouse KYC applies only to LOAN or MORTGAGE applications');
    }

    applyPlatformFieldsToApplication(application, {
      repayingWithSpouse: true,
      spouseFullName: input.fullName,
      spouseEmail: input.email,
      spousePhone: input.phone,
      ...(input.occupation ? { spouseOccupation: input.occupation } : {}),
      ...(input.country ? { spouseCountry: input.country } : {})
    });

    const upstreamApplicationId = await this.ensureUpstreamApplicationForGuarantor(application, product);
    let upstreamSpouse: Awaited<ReturnType<typeof upstreamApplicationService.createSpouseKyc>>;
    try {
      upstreamSpouse = await upstreamApplicationService.createSpouseKyc(upstreamApplicationId, {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        occupation: input.occupation,
        relationship: input.relationship ?? 'spouse',
        country: input.country
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Failed to create spouse KYC link upstream';
      application.upstreamSyncError = message;
      await application.save();
      throw new ApiError(502, `Backend-platter spouse KYC link creation failed: ${message}`);
    }

    const now = new Date().toISOString();
    const spouse: ApplicationSpouseKyc = {
      id: upstreamSpouse.id || 'spouse',
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      occupation: input.occupation,
      relationship: input.relationship ?? 'spouse',
      country: input.country || 'NG',
      status: upstreamSpouse.status || 'pending',
      provider: upstreamSpouse.provider,
      providerReference: upstreamSpouse.providerReference,
      verificationUrl: upstreamSpouse.verificationUrl,
      requestedAt: now,
      raw: upstreamSpouse.raw
    };

    const snapshot = this.contractSnapshotOf(application);
    application.contractSnapshot = {
      ...snapshot,
      spouseKyc: spouse
    };
    application.loanWorkflowStatus = application.loanWorkflowStatus || 'requested';
    application.upstreamSyncError = undefined;
    await application.save();

    return {
      application: toProductApplication(application),
      spouse
    };
  }

  async submitApplication(
    id: string,
    input: SubmitProductApplicationRequest
  ): Promise<ProductApplication> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (input.userId && input.userId !== application.userId) {
      throw new ApiError(403, 'Application does not belong to this user');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Cannot submit ${application.status} application`);
    }

    if (input.acceptedTerms !== true) {
      throw new ApiError(400, 'Terms and conditions must be accepted before submitting application');
    }

    const productDoc = await ProductModel.findById(application.productId);
    if (!productDoc) {
      throw new ApiError(404, 'Product not found');
    }

    const product = toProduct(productDoc);
    const requirementSubmissions = application.requirementSubmissions ?? [];
    this.validateRequirementSubmissions(product.requirements, requirementSubmissions);
    this.validateGuarantorRequirement(product, application);

    if (product.type === 'MORTGAGE' && input.mortgageSelection?.quantity !== undefined) {
      const minimumQuantity = product.minimumQuantity;
      if (minimumQuantity && input.mortgageSelection.quantity < minimumQuantity) {
        throw new ApiError(400, `Mortgage quantity must be at least ${minimumQuantity}`);
      }
    }

    const platformFields = this.resolveSubmittedPlatformFields(application, input, product.type);
    applyPlatformFieldsToApplication(application, platformFields);

    const submittedAt = new Date().toISOString();
    const localContractSnapshot = {
      ...(application.contractSnapshot as Record<string, unknown> | undefined),
      requirements: product.requirements,
      requirementSubmissions,
      finalSubmission: {
        acceptedTerms: input.acceptedTerms,
        submittedAt,
        ...(product.type === 'MORTGAGE' && input.mortgageSelection
          ? { mortgageSelection: input.mortgageSelection }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {})
      }
    };

    const offeringMerchantName = await this.offeringMerchantNameFrom(application, product);
    const merchantDisplay = await this.applicationMerchantDisplayFrom(application, product);
    const upstreamContractSnapshot = {
      principal: application.amount,
      requestedAmount: application.amount,
      amount: application.amount,
      currency: application.currency,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      structure: product.structure,
      about: product.about,
      feesAndCharges: product.feesAndCharges,
      applicantName: this.applicantNameFrom(application),
      offeringMerchantName,
      finalSubmission: localContractSnapshot.finalSubmission,
      ...this.mortgageEquitySnapshotFields(product)
    };

    await this.syncFinalApplicationToUpstream(
      application,
      product,
      upstreamContractSnapshot,
      requirementSubmissions,
      submittedAt
    );

    const previousWorkflowStage = application.loanWorkflowStatus;
    application.contractSnapshot = {
      ...localContractSnapshot,
      guarantors: this.guarantorsFrom(application)
    };
    application.loanWorkflowStatus = 'under_review';
    await application.save();

    void sendProductApplicationSubmittedNotification({
      userId: application.userId,
      ...(application.email ? { email: application.email } : {}),
      applicantName: this.applicantNameFrom(application),
      productName: application.productName,
      productType: application.productType,
      applicationId: application._id.toString(),
      amount: application.amount,
      currency: application.currency,
      merchantName: merchantDisplay.merchantName,
      poweredBy: merchantDisplay.poweredBy,
      contractSnapshot: application.contractSnapshot as Record<string, unknown> | undefined
    });
    void this.notifyWorkflowStageChanged(application, 'under_review', previousWorkflowStage, product);

    return toProductApplication(application);
  }

  async getApplicationById(id: string): Promise<ProductApplication | null> {
    const application = await ProductApplicationModel.findById(id);
    return application ? toProductApplication(application) : null;
  }

  async listApplications(query: ApplicationListQuery = {}): Promise<ProductApplicationListResult> {
    const filters = applicationFilters(query);
    const { page, limit, skip } = normalizeApplicationPagination(query);
    const [total, applications] = await Promise.all([
      ProductApplicationModel.countDocuments(filters),
      ProductApplicationModel.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      applications: applications.map(toProductApplication),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  async getInitStatus(query: {
    userId: string;
    productId: string;
    merchantId?: string;
    appId?: string;
  }): Promise<ProductApplicationInitStatus> {
    const filters: Record<string, unknown> = {
      userId: query.userId,
      productId: query.productId
    };
    if (query.merchantId) filters.merchantId = query.merchantId;
    if (query.appId) filters.appId = query.appId;

    const applications = await ProductApplicationModel.find(filters).sort({ updatedAt: -1 }).exec();
    const accountApplication =
      applications.find((application) => application.productWallet?.upstreamAccount?.accountNumber) ?? applications[0];
    const serialized = accountApplication ? toProductApplication(accountApplication) : undefined;
    const upstreamAccount = serialized?.productWallet?.upstreamAccount;
    const hasUpstreamAccount = Boolean(upstreamAccount?.accountNumber);

    return {
      userId: query.userId,
      productId: query.productId,
      appId: serialized?.appId ?? query.appId,
      merchantId: serialized?.merchantId ?? query.merchantId,
      hasInitializedApplication: applications.length > 0,
      hasUpstreamAccount,
      ...(serialized ? { application: serialized } : {}),
      ...(upstreamAccount ? { upstreamAccount } : {}),
      ...(serialized?.loanWorkflowStatus ? { loanWorkflowStatus: serialized.loanWorkflowStatus } : {}),
      ...(serialized?.upstreamSyncError ? { upstreamSyncError: serialized.upstreamSyncError } : {})
    };
  }

  async summarizeApplications(query: ApplicationListQuery = {}): Promise<ApplicationSummary> {
    const rows = await ProductApplicationModel.aggregate<{ _id: ProductApplicationStatus; count: number }>([
      { $match: applicationFilters(query) },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summary: ApplicationSummary = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      blacklisted: 0
    };

    for (const row of rows) {
      const count = row.count ?? 0;
      summary.total += count;
      if (row._id === 'PENDING') summary.pending = count;
      else if (row._id === 'APPROVED') summary.approved = count;
      else if (row._id === 'REJECTED') summary.rejected = count;
      else if (row._id === 'BLACKLISTED') summary.blacklisted = count;
    }

    return summary;
  }

  async applyPlataLoanWorkflowWebhook(payload: unknown): Promise<PlataLoanWorkflowWebhookResult> {
    const root = this.asRecord(payload);
    if (!root) {
      throw new ApiError(400, 'Webhook payload must be a JSON object');
    }

    const data = this.asRecord(root.data) ?? this.asRecord(root.application) ?? root;
    const applicationRecord = this.asRecord(data.application);
    const eventType = this.firstStringFrom(root, ['event', 'type', 'eventType', 'event_type']);
    if (eventType && eventType !== 'loan_workflow_status.updated') {
      return { duplicate: false, ignored: true };
    }

    const workflowStatus = this.normalizePlataWorkflowStatus(
      this.firstStringFrom(data, ['loanWorkflowStatus', 'loan_workflow_status', 'workflowStatus', 'workflow_status', 'status']) ??
        this.firstStringFrom(applicationRecord, [
          'loanWorkflowStatus',
          'loan_workflow_status',
          'workflowStatus',
          'workflow_status',
          'status'
        ])
    );
    if (!workflowStatus) {
      throw new ApiError(400, 'Valid loan workflow status is required');
    }

    const eventId =
      this.firstStringFrom(root, ['eventId', 'event_id', 'webhookEventId', 'webhook_event_id']) ??
      this.firstStringFrom(data, ['eventId', 'event_id', 'webhookEventId', 'webhook_event_id']);
    const eventAt = this.parseEventDate(
      this.firstStringFrom(root, ['occurredAt', 'occurred_at', 'createdAt', 'created_at', 'timestamp']) ??
        this.firstStringFrom(data, ['occurredAt', 'occurred_at', 'createdAt', 'created_at', 'timestamp'])
    );
    const reason =
      this.firstStringFrom(data, ['reason', 'note', 'message']) ??
      this.firstStringFrom(applicationRecord, ['reason', 'note', 'message']);

    const localApplicationId =
      this.firstStringFrom(data, ['localApplicationId', 'local_application_id', 'springApplicationId', 'spring_application_id']) ??
      this.firstStringFrom(applicationRecord, [
        'localApplicationId',
        'local_application_id',
        'springApplicationId',
        'spring_application_id'
      ]);
    const upstreamApplicationId =
      this.firstStringFrom(data, ['upstreamApplicationId', 'upstream_application_id', 'applicationId', 'application_id', 'id']) ??
      this.firstStringFrom(applicationRecord, [
        'upstreamApplicationId',
        'upstream_application_id',
        'applicationId',
        'application_id',
        'id'
      ]);

    let application: IProductApplicationDocument | null = null;
    if (localApplicationId && mongoose.isValidObjectId(localApplicationId)) {
      application = await ProductApplicationModel.findById(localApplicationId);
    }
    if (!application && upstreamApplicationId) {
      application = await ProductApplicationModel.findOne({ upstreamApplicationId }).sort({ updatedAt: -1 }).exec();
    }
    if (!application) {
      throw new ApiError(404, 'Application not found for Plata loan workflow webhook');
    }

    if (eventId && application.loanWorkflowLastEventId === eventId) {
      return { application: toProductApplication(application), duplicate: true };
    }

    const nextStatus = this.localStatusFromPlataWorkflow(workflowStatus);
    const unchanged =
      application.loanWorkflowStatus === workflowStatus &&
      application.status === nextStatus &&
      (!eventId || application.loanWorkflowLastEventId === eventId);
    if (unchanged) {
      return { application: toProductApplication(application), duplicate: true };
    }

    const previousWorkflowStage = application.loanWorkflowStatus;
    let approvalWalletResult: { wallet?: unknown; transaction?: unknown; duplicate?: boolean } | undefined;
    let approvedAmount: number | undefined;
    let walletAmount: number | undefined;

    const productType = (
      this.firstStringFrom(data, ['productType', 'product_type']) ??
      this.firstStringFrom(applicationRecord, ['productType', 'product_type']) ??
      application.productType
    )
      .toString()
      .toUpperCase();

    const disbursementDeferred =
      data.disbursementDeferred === true || data.disbursement_deferred === true;
    const postApprovalFulfillment = this.asRecord(data.postApprovalFulfillment) ??
      this.asRecord(data.post_approval_fulfillment);
    const loanDisbursementRecord =
      this.asRecord(data.loanDisbursement) ??
      this.asRecord(data.loan_disbursement) ??
      this.asRecord(data.disbursement);

    if (postApprovalFulfillment) {
      application.postApprovalFulfillment =
        postApprovalFulfillment as unknown as typeof application.postApprovalFulfillment;
      application.disbursementDeferred =
        disbursementDeferred || postApprovalFulfillment.status !== 'disbursed';
    } else if (disbursementDeferred) {
      application.disbursementDeferred = true;
    }

    if (loanDisbursementRecord) {
      approvedAmount = this.approvalAmountFrom(data, applicationRecord) ?? application.amount;
      if (approvedAmount === undefined || approvedAmount <= 0) {
        throw new ApiError(400, 'Valid approved amount is required for loan disbursement webhook');
      }
      walletAmount = this.walletAmountFromApproval(approvedAmount, data);
      const upstreamAccount = this.approvalUpstreamAccountFrom(application, data, applicationRecord);
      approvalWalletResult = await this.applyApprovedAmountToWallet(
        application,
        approvedAmount,
        walletAmount,
        eventId,
        upstreamApplicationId,
        eventAt,
        upstreamAccount
      );
      application.amount = approvedAmount;
      application.disbursementDeferred = false;
      void this.collectLendingSettlementOnApproval(application, approvedAmount, eventId);
    } else if (workflowStatus === 'approved') {
      approvedAmount = this.approvalAmountFrom(data, applicationRecord);
      if (approvedAmount === undefined || approvedAmount <= 0) {
        throw new ApiError(400, 'Valid approved amount is required for approved loan workflow webhook');
      }

      const deferredApproval =
        (productType === 'MORTGAGE' || productType === 'LOAN') &&
        (disbursementDeferred || application.disbursementDeferred === true);

      if (!deferredApproval) {
        walletAmount = this.walletAmountFromApproval(approvedAmount, data);
        const upstreamAccount = this.approvalUpstreamAccountFrom(application, data, applicationRecord);
        approvalWalletResult = await this.applyApprovedAmountToWallet(
          application,
          approvedAmount,
          walletAmount,
          eventId,
          upstreamApplicationId,
          eventAt,
          upstreamAccount
        );
        void this.collectLendingSettlementOnApproval(application, approvedAmount, eventId);
      }

      application.amount = approvedAmount;
    }

    application.loanWorkflowStatus = workflowStatus;
    application.status = nextStatus;
    if (eventId) {
      application.loanWorkflowLastEventId = eventId;
    }
    application.loanWorkflowLastEventAt = eventAt;
    if (workflowStatus === 'declined' && reason) {
      application.rejectionReason = reason;
    }
    if (workflowStatus === 'blacklisted' && reason) {
      application.blacklistReason = reason;
    }
    if (workflowStatus === 'approved') {
      application.contractSnapshot = {
        ...(application.contractSnapshot as Record<string, unknown> | undefined),
        approval: {
          approvedAmount,
          walletAmount,
          eventId,
          eventAt: eventAt.toISOString(),
          upstreamApplicationId,
          walletDuplicate: approvalWalletResult?.duplicate === true,
          walletTransaction: approvalWalletResult?.transaction,
          wallet: approvalWalletResult?.wallet,
          disbursementDeferred: application.disbursementDeferred === true,
          postApprovalFulfillment: application.postApprovalFulfillment
        }
      };
    } else if (postApprovalFulfillment) {
      application.contractSnapshot = {
        ...(application.contractSnapshot as Record<string, unknown> | undefined),
        postApprovalFulfillment: application.postApprovalFulfillment
      };
    }

    await application.save();
    void this.notifyWorkflowStageChanged(application, workflowStatus, previousWorkflowStage, undefined, reason);

    if (loanDisbursementRecord && approvedAmount !== undefined && approvedAmount > 0) {
      const snapshot = application.contractSnapshot as Record<string, unknown> | undefined;
      void notifyLoanDisbursedFromSpring({
        userId: application.userId,
        email: application.email,
        userName: this.applicantNameFrom(application),
        productName: application.productName,
        productType: application.productType,
        amount: formatMoney(approvedAmount, application.currency),
        propertyAddress: resolvePropertyAddressFromSnapshot(snapshot, application.productName)
      });
    }

    return { application: toProductApplication(application), duplicate: false };
  }

  async applyPlataGuarantorKycWebhook(
    payload: unknown
  ): Promise<{ duplicate: boolean; ignored?: boolean; notified?: boolean }> {
    const root = this.asRecord(payload);
    if (!root) {
      throw new ApiError(400, 'Webhook payload must be a JSON object');
    }

    const eventType = this.firstStringFrom(root, ['event', 'type', 'eventType', 'event_type'])?.toLowerCase() || '';
    if (eventType.includes('applicant_reported')) {
      return this.applyPlataGuarantorApplicantReportWebhook(payload);
    }

    const data = this.asRecord(root.data) ?? this.asRecord(root.guarantor) ?? root;
    const applicationRecord = this.asRecord(data.application);
    const guarantorRecord = this.asRecord(data.guarantor) ?? this.asRecord(data.guarantorKyc);
    const status = (
      this.firstStringFrom(data, ['status', 'verificationStatus', 'verification_status', 'kycStatus', 'kyc_status']) ??
      this.firstStringFrom(guarantorRecord, ['status', 'verificationStatus', 'verification_status', 'kycStatus', 'kyc_status']) ??
      ''
    ).toLowerCase();
    const normalizedEvent = eventType || '';
    const approved =
      ['approved', 'verified', 'completed', 'complete', 'success'].some((hint) => status.includes(hint)) ||
      ['approved', 'verified', 'completed', 'complete', 'success'].some((hint) => normalizedEvent.includes(hint));

    if (eventType && !normalizedEvent.includes('guarantor') && !approved) {
      return { duplicate: false, ignored: true };
    }
    if (!approved) {
      return { duplicate: false, ignored: true };
    }

    const guarantorId =
      this.firstStringFrom(data, ['guarantorId', 'guarantor_id']) ??
      this.firstStringFrom(guarantorRecord, ['id', 'guarantorId', 'guarantor_id']);
    if (!guarantorId) {
      throw new ApiError(400, 'guarantorId is required');
    }

    const localApplicationId =
      this.firstStringFrom(data, ['localApplicationId', 'local_application_id', 'springApplicationId', 'spring_application_id']) ??
      this.firstStringFrom(applicationRecord, [
        'localApplicationId',
        'local_application_id',
        'springApplicationId',
        'spring_application_id'
      ]);
    const upstreamApplicationId =
      this.firstStringFrom(data, ['upstreamApplicationId', 'upstream_application_id', 'applicationId', 'application_id', 'id']) ??
      this.firstStringFrom(applicationRecord, [
        'upstreamApplicationId',
        'upstream_application_id',
        'applicationId',
        'application_id',
        'id'
      ]);

    let application: IProductApplicationDocument | null = null;
    if (localApplicationId && mongoose.isValidObjectId(localApplicationId)) {
      application = await ProductApplicationModel.findById(localApplicationId);
    }
    if (!application && upstreamApplicationId) {
      application = await ProductApplicationModel.findOne({ upstreamApplicationId }).sort({ updatedAt: -1 }).exec();
    }
    if (!application) {
      throw new ApiError(404, 'Application not found for Plata guarantor KYC webhook');
    }

    return this.handleGuarantorKycCompleted(application._id.toString(), guarantorId);
  }

  async applyPlataGuarantorApplicantReportWebhook(
    payload: unknown
  ): Promise<{ duplicate: boolean; ignored?: boolean; notified?: boolean }> {
    const root = this.asRecord(payload);
    if (!root) {
      throw new ApiError(400, 'Webhook payload must be a JSON object');
    }

    const data = this.asRecord(root.data) ?? root;
    const guarantorRecord = this.asRecord(data.guarantor) ?? this.asRecord(data.guarantorKyc);
    const guarantorId =
      this.firstStringFrom(data, ['guarantorId', 'guarantor_id']) ??
      this.firstStringFrom(guarantorRecord, ['id', 'guarantorId', 'guarantor_id']);
    if (!guarantorId) {
      throw new ApiError(400, 'guarantorId is required');
    }

    const localApplicationId =
      this.firstStringFrom(data, ['localApplicationId', 'local_application_id', 'springApplicationId', 'spring_application_id']);
    const upstreamApplicationId =
      this.firstStringFrom(data, ['upstreamApplicationId', 'upstream_application_id', 'applicationId', 'application_id', 'id']);

    let application: IProductApplicationDocument | null = null;
    if (localApplicationId && mongoose.isValidObjectId(localApplicationId)) {
      application = await ProductApplicationModel.findById(localApplicationId);
    }
    if (!application && upstreamApplicationId) {
      application = await ProductApplicationModel.findOne({ upstreamApplicationId }).sort({ updatedAt: -1 }).exec();
    }
    if (!application) {
      throw new ApiError(404, 'Application not found for Plata guarantor applicant report webhook');
    }

    const reportedAt =
      this.firstStringFrom(data, ['reportedAt', 'reported_at']) ??
      this.firstStringFrom(guarantorRecord, ['applicantReportedAt', 'applicant_reported_at']) ??
      new Date().toISOString();
    const guarantorName =
      this.firstStringFrom(guarantorRecord, ['fullName', 'full_name', 'name']) ?? 'Guarantor';

    if (
      application.applicantGuarantorReport?.guarantorId === guarantorId &&
      application.applicantGuarantorReport?.reportedAt
    ) {
      return { duplicate: true, notified: false };
    }

    application.applicantGuarantorReport = {
      guarantorId,
      guarantorName,
      reportedAt
    };

    const guarantors = this.guarantorsFrom(application);
    if (guarantors.length > 0) {
      const snapshot = this.contractSnapshotOf(application);
      snapshot.guarantors = guarantors.map((item) =>
        item.id === guarantorId
          ? {
              ...item,
              kyc: {
                ...(item.kyc || { userRef: `guarantor_${application!._id.toString()}_${guarantorId}` }),
                applicantReportedAt: reportedAt
              }
            }
          : item
      );
      application.contractSnapshot = snapshot;
    }

    await application.save();

    const productDoc = await ProductModel.findById(application.productId);
    const product = productDoc ? toProduct(productDoc) : undefined;
    const merchantOwner = application.merchantId
      ? await clientAuthUserService.resolveMerchantOwner(application.merchantId)
      : undefined;

    void sendGuarantorApplicantReportedNotification({
      merchantOwner,
      applicantName: this.applicantNameFrom(application),
      guarantorName,
      productName: application.productName,
      productType: application.productType,
      applicationId: application._id.toString(),
      merchantName: await this.offeringMerchantNameFrom(application, product)
    });

    return { duplicate: false, notified: true };
  }

  async updateApplicationStatus(
    id: string,
    status: 'BLACKLISTED',
    reason?: string
  ): Promise<ProductApplication> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Application is already ${application.status}`);
    }

    const previousWorkflowStage = application.loanWorkflowStatus;
    application.status = status;
    application.loanWorkflowStatus = status.toLowerCase();
    if (reason) {
      application.blacklistReason = reason;
    }

    await application.save();
    void this.notifyWorkflowStageChanged(application, application.loanWorkflowStatus, previousWorkflowStage, undefined, reason);
    return toProductApplication(application);
  }
}

export default new ProductApplicationService();
