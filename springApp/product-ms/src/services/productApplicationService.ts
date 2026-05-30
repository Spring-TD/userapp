import { ApiError } from '../middleware/errorHandler';
import { randomUUID } from 'crypto';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  IProductApplicationDocument,
  ProductApplicationModel,
  toProductApplication
} from '../models/ProductApplicationModel';
import walletService from './walletService';
import upstreamApplicationService from './upstreamApplicationService';
import guarantorKycService from './guarantorKycService';
import type { LoanRequirements, Product } from '../types/product';
import type {
  ApplicationListQuery,
  ApplicationSummary,
  CreateApplicationGuarantorRequest,
  CreateProductApplicationRequest,
  ProductApplication,
  ProductApplicationStatus,
  SubmitProductApplicationRequest,
  ProductRequirementSubmission,
  SubmitProductApplicationRequirementsRequest
} from '../types/productApplication';

function applicationFilters(query: ApplicationListQuery): Record<string, string> {
  const filters: Record<string, string> = {};
  if (query.merchantId) filters.merchantId = query.merchantId;
  if (query.userId) filters.userId = query.userId;
  if (query.appId) filters.appId = query.appId.trim();
  if (query.status) filters.status = query.status;
  if (query.productType) filters.productType = query.productType.trim().toUpperCase();
  return filters;
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
  kyc: {
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

export class ProductApplicationService {
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
    const missingKyc = guarantors.find((guarantor) => !guarantor.kyc?.verificationUrl);
    if (missingKyc) {
      throw new ApiError(400, `Guarantor ${missingKyc.fullName || missingKyc.email} is missing a KYC verification URL`);
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

  private async createApplicationRecord(
    input: CreateProductApplicationRequest,
    product: Product,
    requirementSubmissions: ProductRequirementSubmission[],
    loanWorkflowStatus: string
  ): Promise<IProductApplicationDocument> {
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
        productType: product.type,
        structure: product.structure,
        requirements: product.requirements
      },
      loanWorkflowStatus,
      requirementSubmissions
    });
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
    options: { requireUpstreamAccount?: boolean } = {}
  ): Promise<void> {
    const merchantId = input.merchantId;
    if (!merchantId) {
      throw new ApiError(400, 'merchantId is required for loan and mortgage applications');
    }

    try {
      const upstream = await upstreamApplicationService.submitExternalApplication({
        localApplicationId: application._id.toString(),
        localAppId: product.appId,
        integratorMerchantId: input.integratorMerchantId?.trim() || '',
        integratorMerchantName: input.integratorMerchantName?.trim(),
        offeringMerchantId: merchantId,
        offeringMerchantName: input.offeringMerchantName,
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
      }

      if (upstream.skipReason) {
        if (options.requireUpstreamAccount) {
          throw new ApiError(502, `Plata account provisioning skipped: ${upstream.skipReason}`);
        }
        application.upstreamSyncError = upstream.skipReason;
        await application.save();
        console.warn('Upstream external-applications skipped:', upstream.skipReason);
        return;
      }

      if (options.requireUpstreamAccount && !upstream.upstreamAccount?.accountNumber) {
        throw new ApiError(502, 'Plata did not return a created account number');
      }

      await application.save();
    } catch (error) {
      if (error instanceof ApiError) {
        application.upstreamSyncError = error.message;
        await application.save();
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Upstream sync failed';
      application.upstreamSyncError = message;
      await application.save();
      throw new ApiError(502, `Application saved locally, but upstream Plata sync failed: ${message}`);
    }
  }

  async createApplication(input: CreateProductApplicationRequest): Promise<ProductApplication> {
    const product = await this.resolveLoanProduct(input);
    const requirementSubmissions = input.requirementSubmissions ?? [];
    this.validateRequirementSubmissions(product.requirements, requirementSubmissions);

    const application = await this.createApplicationRecord(
      input,
      product,
      requirementSubmissions,
      'requested'
    );

    await this.provisionProductWallet(application, input, product);
    await this.syncUpstreamApplication(application, input, product, requirementSubmissions);

    if (requirementSubmissions.length > 0) {
      application.loanWorkflowStatus = 'requirements_submitted';
      await application.save();
    }

    return toProductApplication(application);
  }

  async initializeApplication(input: CreateProductApplicationRequest): Promise<ProductApplication> {
    const product = await this.resolveLoanProduct(input);
    const application = await this.createApplicationRecord(input, product, [], 'account_requested');

    await this.syncUpstreamApplication(application, input, product, [], {
      requireUpstreamAccount: true
    });

    return toProductApplication(application);
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

  async createGuarantor(
    id: string,
    input: CreateApplicationGuarantorRequest
  ): Promise<{ application: ProductApplication; guarantor: ApplicationGuarantor }> {
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
      (guarantor) => guarantor.email.toLowerCase() === input.email.toLowerCase()
    );
    if (existingIndex === -1 && existingGuarantors.length >= 2) {
      throw new ApiError(400, 'A maximum of 2 guarantors can be added');
    }

    const now = new Date().toISOString();
    const guarantorId = existingIndex >= 0 ? existingGuarantors[existingIndex].id : randomUUID();
    const kyc = await guarantorKycService.createVerification({
      applicationId: application._id.toString(),
      product,
      guarantorId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      occupation: input.occupation,
      relationship: input.relationship,
      country: input.country,
      callback: input.callback,
      redirect: input.redirect
    });

    const guarantor: ApplicationGuarantor = {
      id: guarantorId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      occupation: input.occupation,
      relationship: input.relationship,
      country: input.country || 'NG',
      kyc,
      createdAt: existingIndex >= 0 ? existingGuarantors[existingIndex].createdAt : now,
      updatedAt: now
    };

    const guarantors =
      existingIndex >= 0
        ? existingGuarantors.map((item, index) => (index === existingIndex ? guarantor : item))
        : [...existingGuarantors, guarantor];

    const snapshot = this.contractSnapshotOf(application);
    application.contractSnapshot = {
      ...snapshot,
      guarantors
    };
    application.loanWorkflowStatus = 'guarantor_kyc_requested';
    await application.save();

    return {
      application: toProductApplication(application),
      guarantor
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

    application.contractSnapshot = {
      ...(application.contractSnapshot as Record<string, unknown> | undefined),
      requirements: product.requirements,
      requirementSubmissions,
      finalSubmission: {
        acceptedTerms: input.acceptedTerms,
        submittedAt: new Date().toISOString(),
        ...(product.type === 'MORTGAGE' && input.mortgageSelection
          ? { mortgageSelection: input.mortgageSelection }
          : {}),
        ...(input.metadata ? { metadata: input.metadata } : {})
      }
    };
    application.loanWorkflowStatus = 'under_review';
    await application.save();

    return toProductApplication(application);
  }

  async getApplicationById(id: string): Promise<ProductApplication | null> {
    const application = await ProductApplicationModel.findById(id);
    return application ? toProductApplication(application) : null;
  }

  async listApplications(query: ApplicationListQuery = {}): Promise<ProductApplication[]> {
    const applications = await ProductApplicationModel.find(applicationFilters(query)).sort({
      createdAt: -1
    });
    return applications.map(toProductApplication);
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

  async updateApplicationStatus(
    id: string,
    status: Exclude<ProductApplicationStatus, 'PENDING'>,
    reason?: string
  ): Promise<ProductApplication> {
    const application = await ProductApplicationModel.findById(id);
    if (!application) {
      throw new ApiError(404, 'Application not found');
    }

    if (application.status !== 'PENDING') {
      throw new ApiError(400, `Application is already ${application.status}`);
    }

    application.status = status;
    application.loanWorkflowStatus = status.toLowerCase();
    if (status === 'REJECTED' && reason) {
      application.rejectionReason = reason;
    }
    if (status === 'BLACKLISTED' && reason) {
      application.blacklistReason = reason;
    }

    await application.save();
    return toProductApplication(application);
  }
}

export default new ProductApplicationService();
