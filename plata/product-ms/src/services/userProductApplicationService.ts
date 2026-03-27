import mongoose from 'mongoose';
import { ProductModel, toProduct } from '../models/ProductModel';
import type { IProductDocument } from '../models/ProductModel';
import {
  UserProductApplicationModel,
  toUserProductApplication
} from '../models/UserProductApplicationModel';
import type { IUserProductApplicationDocument } from '../models/UserProductApplicationModel';
import { ApiError } from '../middleware/errorHandler';
import type {
  CreateUserProductApplicationRequest,
  ListUserProductApplicationsQuery,
  UserProductApplication
} from '../types/userProductApplication';
import { normalizeProductType } from '../utils/productType';

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
}
