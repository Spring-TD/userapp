import { ApiError } from '../middleware/errorHandler';
import { ProductModel, toProduct } from '../models/ProductModel';
import {
  ProductApplicationModel,
  toProductApplication
} from '../models/ProductApplicationModel';
import walletService from './walletService';
import upstreamApplicationService from './upstreamApplicationService';
import type { LoanRequirements } from '../types/product';
import type {
  CreateProductApplicationRequest,
  ProductApplication,
  ProductApplicationStatus,
  ProductRequirementSubmission
} from '../types/productApplication';

type ApplicationQuery = {
  merchantId?: string;
  userId?: string;
  status?: ProductApplicationStatus;
  productType?: string;
};

type RequirementItem = {
  id?: string;
  requirementType?: string;
  contentType?: string;
  description?: string;
  uploadRequired?: boolean;
  required?: boolean;
};

export class ProductApplicationService {
  private requirementKey(item: RequirementItem, index: number): string {
    return String(item.id ?? item.requirementType ?? item.description ?? index).trim();
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
    if (!Array.isArray(otherRequirements) || otherRequirements.length === 0) {
      return;
    }

    const missing: string[] = [];
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

      const expectsUpload = item.uploadRequired === true || item.contentType === 'document';
      if (expectsUpload && !matchingSubmission.fileUrl) {
        missing.push(`${key} fileUrl`);
      }
    }

    if (missing.length > 0) {
      throw new ApiError(400, `Missing required product requirement submissions: ${missing.join(', ')}`);
    }
  }

  async createApplication(input: CreateProductApplicationRequest): Promise<ProductApplication> {
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

    const requirementSubmissions = input.requirementSubmissions ?? [];
    this.validateRequirementSubmissions(product.requirements, requirementSubmissions);

    const application = await ProductApplicationModel.create({
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
      loanWorkflowStatus: 'requested',
      requirementSubmissions
    });

    try {
      const productWallet = await walletService.ensureProductWallet({
        userId: input.userId,
        merchantId: input.merchantId,
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
      await application.save();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product wallet';
      throw new ApiError(502, `Application created, but product wallet provisioning failed: ${message}`);
    }

    try {
      const upstream = await upstreamApplicationService.submitExternalApplication({
        localApplicationId: application._id.toString(),
        localAppId: product.appId,
        integratorMerchantId: input.integratorMerchantId?.trim() || '',
        integratorMerchantName: input.integratorMerchantName?.trim(),
        offeringMerchantId: input.merchantId,
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
        await application.save();
      } else if (upstream.skipReason) {
        application.upstreamSyncError = upstream.skipReason;
        await application.save();
        console.warn('Upstream external-applications skipped:', upstream.skipReason);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upstream sync failed';
      application.upstreamSyncError = message;
      await application.save();
      throw new ApiError(502, `Application saved locally, but upstream Plata sync failed: ${message}`);
    }

    return toProductApplication(application);
  }

  async getApplicationById(id: string): Promise<ProductApplication | null> {
    const application = await ProductApplicationModel.findById(id);
    return application ? toProductApplication(application) : null;
  }

  async listApplications(query: ApplicationQuery = {}): Promise<ProductApplication[]> {
    const filters: Record<string, string> = {};
    if (query.merchantId) filters.merchantId = query.merchantId;
    if (query.userId) filters.userId = query.userId;
    if (query.status) filters.status = query.status;
    if (query.productType) filters.productType = query.productType;

    const applications = await ProductApplicationModel.find(filters).sort({ createdAt: -1 });
    return applications.map(toProductApplication);
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
