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
      userId: data.userId,
      productType: data.productType,
      globalProductId: data.globalProductId,
      globalProductReferenceNumber:
        data.globalProductReferenceNumber ?? product.referenceNumber,
      merchantProductId: data.merchantProductId,
      status: data.status ?? 'submitted',
      ...(isLendingProductType(data.productType) ? { loanWorkflowStatus: 'requested' as const } : {}),
      submittedAt,
      signedAt,
      contractSnapshot: data.contractSnapshot,
      payoutSplit: data.payoutSplit ?? {},
      snapshotVersion: data.snapshotVersion ?? 1,
      snapshotHash: data.snapshotHash
    });

    return toUserProductApplication(doc as IUserProductApplicationDocument);
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
