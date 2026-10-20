import mongoose from 'mongoose';
import { ProductModel, toProduct } from '../models/ProductModel';
import type { IProductDocument } from '../models/ProductModel';
import {
  UserProductApplicationModel,
  toUserProductApplication
} from '../models/UserProductApplicationModel';
import type { IUserProductApplicationDocument } from '../models/UserProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type { ProductDiscriminator } from '../types/product';
import type {
  CreateUserProductApplicationRequest,
  ListLoanWorkflowQuery,
  ListUserProductApplicationsQuery,
  LoanWorkflowStatus,
  UserProductApplication
} from '../types/userProductApplication';
import { normalizeProductType } from '../utils/productType';

const LENDING_PRODUCT_TYPES: ProductDiscriminator[] = ['LOAN', 'MORTGAGE'];

function isLendingProductType(t: ProductDiscriminator): boolean {
  return LENDING_PRODUCT_TYPES.includes(t);
}

export class UserProductApplicationService {
  async create(data: CreateUserProductApplicationRequest): Promise<UserProductApplication> {
    if (!mongoose.isValidObjectId(data.globalProductId)) {
      throw new ApiError(400, 'globalProductId must be a valid MongoDB ObjectId');
    }

    const productDoc = await ProductModel.findById(data.globalProductId).lean();
    if (!productDoc) {
      throw new ApiError(404, 'Global product not found');
    }

    const product = toProduct(productDoc as IProductDocument);
    const canonicalType = normalizeProductType(product.type);
    if (canonicalType !== data.productType) {
      throw new ApiError(
        400,
        `productType must match the global product (expected ${canonicalType})`
      );
    }

    const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
    const signedAt = data.signedAt ? new Date(data.signedAt) : undefined;

    const doc = await UserProductApplicationModel.create({
      appId: data.appId,
      merchantId: data.merchantId,
      merchantName: data.merchantName,
      offeringMerchantId: data.offeringMerchantId,
      offeringMerchantName: data.offeringMerchantName,
      externalPlatformMerchantId: data.externalPlatformMerchantId,
      externalPlatformMerchantName: data.externalPlatformMerchantName,
      userId: data.userId,
      customerName: data.customerName,
      productType: data.productType,
      globalProductId: data.globalProductId,
      productName: data.productName,
      globalProductReferenceNumber:
        data.globalProductReferenceNumber ?? product.referenceNumber,
      localApplicationId: data.localApplicationId,
      merchantProductId: data.merchantProductId,
      status: data.status ?? 'submitted',
      ...(isLendingProductType(data.productType) ? { loanWorkflowStatus: 'requested' as const } : {}),
      submittedAt,
      signedAt,
      contractSnapshot: data.contractSnapshot,
      payoutSplit: data.payoutSplit ?? {},
      snapshotVersion: data.snapshotVersion ?? 1,
      snapshotHash: data.snapshotHash,
      submittedRequirements: data.submittedRequirements,
      applicantSignatureUrl: data.applicantSignatureUrl,
      applicantSignatureKey: data.applicantSignatureKey,
      applicantSignatureFileName: data.applicantSignatureFileName,
      isPoliticallyExposedPerson: data.isPoliticallyExposedPerson,
      monthlyIncome: data.monthlyIncome,
      repaymentSource: data.repaymentSource,
      repaymentSourceOther: data.repaymentSourceOther,
      maritalStatus: data.maritalStatus,
      maritalStatusOther: data.maritalStatusOther,
      loanReason: data.loanReason,
      loanReasonOther: data.loanReasonOther,
      repayingWithSpouse: data.repayingWithSpouse,
      spouseFullName: data.spouseFullName,
      spouseEmail: data.spouseEmail,
      spousePhone: data.spousePhone,
      spouseOccupation: data.spouseOccupation,
      spouseCountry: data.spouseCountry,
      occupation: data.occupation,
      placeOfWork: data.placeOfWork,
      hrName: data.hrName,
      hrEmail: data.hrEmail,
      applicantProfileSnapshot: data.applicantProfileSnapshot,
      loanWorkflowCallbackUrl: data.loanWorkflowCallbackUrl,
      guarantorKycCallbackUrl: data.guarantorKycCallbackUrl
    });

    return toUserProductApplication(doc as IUserProductApplicationDocument);
  }

  /** Loan workflow callback — no-op stub when webhook pipeline is not restored. */
  async sendLoanSubmissionWebhook(
    application: UserProductApplication
  ): Promise<UserProductApplication> {
    console.warn(
      '[product-ms] sendLoanSubmissionWebhook stub — skipping webhook for',
      application.id
    );
    return application;
  }

  /** OpenSanctions / screening — no-op stub for non-lending / incomplete restore. */
  async screenApplicantOnSubmit(
    application: UserProductApplication
  ): Promise<UserProductApplication> {
    console.warn(
      '[product-ms] screenApplicantOnSubmit stub — returning application unchanged',
      application.id
    );
    return application;
  }

  /** Auto-approve — no-op stub; returns application unchanged. */
  async maybeAutoApproveLoan(
    application: UserProductApplication
  ): Promise<UserProductApplication> {
    console.warn(
      '[product-ms] maybeAutoApproveLoan stub — returning application unchanged',
      application.id
    );
    return application;
  }

  async respondToLoanOffer(
    _applicationId: string,
    _userId: string,
    _input: { action: 'accept' | 'decline'; acceptedTerms?: boolean }
  ): Promise<UserProductApplication> {
    throw new ApiError(501, 'Loan offer response is not available in this product-ms build');
  }

  async payLoanDownPaymentAndAccept(
    _applicationId: string,
    _userId: string,
    _input: { amount: number; providerReference: string; acceptedTerms?: boolean }
  ): Promise<UserProductApplication> {
    throw new ApiError(501, 'Loan down-payment accept is not available in this product-ms build');
  }

  async getById(applicationId: string): Promise<UserProductApplication | null> {
    if (!mongoose.isValidObjectId(applicationId)) {
      return null;
    }
    const doc = await UserProductApplicationModel.findById(applicationId).lean();
    if (!doc) return null;
    return toUserProductApplication(doc as unknown as Record<string, unknown>);
  }

  async list(
    query: ListUserProductApplicationsQuery
  ): Promise<{ items: UserProductApplication[]; total: number }> {
    const filter: Record<string, string> = {};
    if (query.appId) filter.appId = query.appId;
    if (query.userId) filter.userId = query.userId;
    if (query.offeringMerchantId) filter.offeringMerchantId = query.offeringMerchantId;
    if (query.merchantId) filter.merchantId = query.merchantId;
    if (query.globalProductId) filter.globalProductId = query.globalProductId;
    if (query.productType) filter.productType = query.productType;
    if (query.status) filter.status = query.status;

    const [raw, total] = await Promise.all([
      UserProductApplicationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      UserProductApplicationModel.countDocuments(filter)
    ]);

    return {
      items: raw.map((row) => toUserProductApplication(row as unknown as Record<string, unknown>)),
      total
    };
  }

  /**
   * Loan / mortgage applications for which `merchantId` is the originating product creator.
   * Optional `loanWorkflowStatus` filters the dashboard tab; `requested` includes legacy docs without the field.
   */
  async listLoanWorkflowForCreator(
    creatorMerchantId: string,
    query: ListLoanWorkflowQuery
  ): Promise<{ items: UserProductApplication[]; total: number }> {
    const base: Record<string, unknown> = {
      merchantId: creatorMerchantId,
      productType: { $in: LENDING_PRODUCT_TYPES }
    };

    if (query.loanWorkflowStatus === 'requested') {
      base.$or = [
        { loanWorkflowStatus: 'requested' },
        { loanWorkflowStatus: { $exists: false } },
        { loanWorkflowStatus: null }
      ];
    } else if (query.loanWorkflowStatus !== undefined) {
      base.loanWorkflowStatus = query.loanWorkflowStatus;
    }

    const [raw, total] = await Promise.all([
      UserProductApplicationModel.find(base)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      UserProductApplicationModel.countDocuments(base)
    ]);

    return {
      items: raw.map((row) => toUserProductApplication(row as unknown as Record<string, unknown>)),
      total
    };
  }

  async setLoanWorkflowStatus(
    applicationId: string,
    creatorMerchantId: string,
    loanWorkflowStatus: LoanWorkflowStatus
  ): Promise<UserProductApplication> {
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new ApiError(404, 'Application not found');
    }

    const existing = await UserProductApplicationModel.findById(applicationId).lean();
    if (!existing) {
      throw new ApiError(404, 'Application not found');
    }

    if (String(existing.merchantId) !== creatorMerchantId) {
      throw new ApiError(403, 'Only the originating product merchant can update loan workflow status');
    }

    const pType = normalizeProductType(String(existing.productType));
    if (!isLendingProductType(pType)) {
      throw new ApiError(400, 'Loan workflow applies only to LOAN or MORTGAGE applications');
    }

    const updated = await UserProductApplicationModel.findByIdAndUpdate(
      applicationId,
      { $set: { loanWorkflowStatus } },
      { new: true, lean: true }
    );

    if (!updated) {
      throw new ApiError(404, 'Application not found');
    }

    return toUserProductApplication(updated as unknown as Record<string, unknown>);
  }
}
