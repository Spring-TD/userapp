import axios from 'axios';
import { config } from '../config/environment';
import { ProductModel } from '../models/ProductModel';
import { SubMerchantProductActivationModel } from '../models/SubMerchantProductActivationModel';
import { SubMerchantProductUsageEventModel } from '../models/SubMerchantProductUsageEventModel';
import type { SubMerchantProductUsageEvent } from '../types/subMerchantProductUsageEvent';
import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus
} from '../types/subMerchantProductActivation';
import type {
  ListSubMerchantCustomerDashboardResponse,
  SubMerchantCustomerDashboardRow
} from '../types/subMerchantDashboard';
import { normalizeComplianceFields } from '../utils/subMerchantCompliance';

export interface UpsertSubMerchantUsageEventInput {
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productName?: string;
  merchantId: string;
  merchantName: string;
  subMerchant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  externalUser: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  startedAt?: string;
}

export interface ListSubMerchantCustomerDashboardInput {
  appId: string;
  merchantId: string;
  subMerchantId?: string;
  search?: string;
  limit: number;
  skip: number;
}

function toApiShape(doc: {
  _id: { toString: () => string };
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productNameSnapshot?: string;
  merchantId: string;
  merchantName: string;
  subMerchantId: string;
  subMerchantName: string;
  subMerchantEmail: string;
  subMerchantPhone: string;
  externalUserId: string;
  externalUserName: string;
  externalUserEmail: string;
  externalUserPhone: string;
  eventType: 'started_using_product';
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): SubMerchantProductUsageEvent {
  return {
    id: doc._id.toString(),
    plataMerchantId: doc.plataMerchantId,
    apiKeyId: doc.apiKeyId,
    gatewayEnvironment: doc.gatewayEnvironment,
    appId: doc.appId,
    productId: doc.productId,
    productNameSnapshot: doc.productNameSnapshot,
    merchantId: doc.merchantId,
    merchantName: doc.merchantName,
    subMerchantId: doc.subMerchantId,
    subMerchantName: doc.subMerchantName,
    subMerchantEmail: doc.subMerchantEmail,
    subMerchantPhone: doc.subMerchantPhone,
    externalUserId: doc.externalUserId,
    externalUserName: doc.externalUserName,
    externalUserEmail: doc.externalUserEmail,
    externalUserPhone: doc.externalUserPhone,
    eventType: doc.eventType,
    startedAt: doc.startedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class SubMerchantProductUsageEventService {
  private async mirrorToClientAuth(data: SubMerchantProductUsageEvent): Promise<void> {
    try {
      await axios.post(
        `${config.clientAuthUrl}/internal/api/v1/external-users/usage-events`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': config.clientAuthInternalToken
          },
          timeout: 10_000
        }
      );
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? `${error.message} (${error.response?.status ?? 'no-status'})`
        : 'unknown error';
      // Mirror should not block product-ms source-of-truth persistence.
      console.warn('Mirror to client-auth-ms failed:', message);
    }
  }

  async upsert(input: UpsertSubMerchantUsageEventInput): Promise<SubMerchantProductUsageEvent> {
    const product = await ProductModel.findById(input.productId).lean();
    if (!product) {
      throw Object.assign(new Error('Product not found'), { statusCode: 404 });
    }

    const productNameSnapshot =
      input.productName?.trim() ||
      (typeof product.name === 'string' ? product.name : String(product.name ?? '')) ||
      undefined;

    const merchantId = input.merchantId.trim();
    const merchantName = input.merchantName.trim();
    const subMerchantId = input.subMerchant.id.trim();
    const externalUserId = input.externalUser.id.trim();
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();

    const filter = {
      plataMerchantId: input.plataMerchantId,
      appId: input.appId,
      productId: input.productId,
      merchantId,
      subMerchantId,
      externalUserId,
      eventType: 'started_using_product' as const
    };

    const setDoc = {
      plataMerchantId: input.plataMerchantId,
      appId: input.appId,
      productId: input.productId,
      merchantId,
      merchantName,
      subMerchantId,
      subMerchantName: input.subMerchant.name.trim(),
      subMerchantEmail: input.subMerchant.email.trim(),
      subMerchantPhone: input.subMerchant.phone.trim(),
      externalUserId,
      externalUserName: input.externalUser.name.trim(),
      externalUserEmail: input.externalUser.email.trim(),
      externalUserPhone: input.externalUser.phone.trim(),
      eventType: 'started_using_product' as const,
      startedAt,
      ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
      ...(input.gatewayEnvironment ? { gatewayEnvironment: input.gatewayEnvironment } : {}),
      ...(productNameSnapshot ? { productNameSnapshot } : {})
    };

    const doc = await SubMerchantProductUsageEventModel.findOneAndUpdate(
      filter,
      { $set: setDoc },
      { new: true, upsert: true, runValidators: true }
    ).exec();

    if (!doc) {
      throw new Error('Failed to save sub-merchant product usage event');
    }

    const saved = toApiShape(doc);
    await this.mirrorToClientAuth(saved);
    return saved;
  }

  async listCustomerDashboard(
    input: ListSubMerchantCustomerDashboardInput
  ): Promise<ListSubMerchantCustomerDashboardResponse> {
    const baseMatch: Record<string, unknown> = {
      appId: input.appId,
      merchantId: input.merchantId
    };
    if (input.subMerchantId) {
      baseMatch.subMerchantId = input.subMerchantId.trim();
    }

    const search = input.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseMatch.$or = [
        { externalUserName: { $regex: escaped, $options: 'i' } },
        { externalUserEmail: { $regex: escaped, $options: 'i' } },
        { externalUserPhone: { $regex: escaped, $options: 'i' } },
        { subMerchantName: { $regex: escaped, $options: 'i' } }
      ];
    }

    const rows = await SubMerchantProductUsageEventModel.aggregate<
      Omit<SubMerchantCustomerDashboardRow, 'complianceStatus' | 'complianceDocuments'>
    >([
      { $match: baseMatch },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: {
            subMerchantId: '$subMerchantId',
            externalUserId: '$externalUserId'
          },
          externalUserId: { $first: '$externalUserId' },
          externalUserName: { $first: '$externalUserName' },
          externalUserEmail: { $first: '$externalUserEmail' },
          externalUserPhone: { $first: '$externalUserPhone' },
          subMerchantId: { $first: '$subMerchantId' },
          subMerchantName: { $first: '$subMerchantName' },
          subMerchantEmail: { $first: '$subMerchantEmail' },
          subMerchantPhone: { $first: '$subMerchantPhone' },
          merchantId: { $first: '$merchantId' },
          merchantName: { $first: '$merchantName' },
          plataMerchantId: { $first: '$plataMerchantId' },
          usageEventsCount: { $sum: 1 },
          products: {
            $push: {
              productId: '$productId',
              productNameSnapshot: '$productNameSnapshot',
              startedAt: '$startedAt',
              updatedAt: '$updatedAt'
            }
          },
          latestStartedAt: { $max: '$startedAt' },
          latestUsageAt: { $max: '$updatedAt' },
          createdAt: { $min: '$createdAt' },
          updatedAt: { $max: '$updatedAt' }
        }
      },
      {
        $project: {
          _id: 0,
          externalUserId: 1,
          externalUserName: 1,
          externalUserEmail: 1,
          externalUserPhone: 1,
          subMerchantId: 1,
          subMerchantName: 1,
          subMerchantEmail: 1,
          subMerchantPhone: 1,
          merchantId: 1,
          merchantName: 1,
          plataMerchantId: 1,
          usageEventsCount: 1,
          productsCount: { $size: '$products' },
          products: 1,
          latestStartedAt: 1,
          latestUsageAt: 1,
          lastActivityAt: '$latestUsageAt',
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { lastActivityAt: -1 } },
      { $skip: input.skip },
      { $limit: input.limit }
    ]).exec();

    const subMerchantIds = [...new Set(rows.map((r) => r.subMerchantId))];
    const complianceBySubMerchant = new Map<
      string,
      {
        complianceStatus?: SubMerchantComplianceStatus | null;
        complianceDocuments?: SubMerchantComplianceDocument[] | null;
      }
    >();
    if (subMerchantIds.length > 0) {
      const compAgg = await SubMerchantProductActivationModel.aggregate<{
        _id: string;
        complianceStatus?: SubMerchantComplianceStatus | null;
        complianceDocuments?: SubMerchantComplianceDocument[] | null;
      }>([
        {
          $match: {
            appId: input.appId,
            merchantId: input.merchantId,
            subMerchantId: { $in: subMerchantIds }
          }
        },
        { $sort: { updatedAt: -1 } },
        {
          $group: {
            _id: '$subMerchantId',
            complianceStatus: { $first: '$complianceStatus' },
            complianceDocuments: { $first: '$complianceDocuments' }
          }
        }
      ]).exec();
      for (const c of compAgg) {
        complianceBySubMerchant.set(c._id, {
          complianceStatus: c.complianceStatus,
          complianceDocuments: c.complianceDocuments
        });
      }
    }

    const items: SubMerchantCustomerDashboardRow[] = rows.map((r) => {
      const raw = complianceBySubMerchant.get(r.subMerchantId);
      const comp = normalizeComplianceFields({
        complianceStatus: raw?.complianceStatus,
        complianceDocuments: raw?.complianceDocuments
      });
      return { ...r, ...comp };
    });

    const totalRows = await SubMerchantProductUsageEventModel.aggregate<{ total: number }>([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            subMerchantId: '$subMerchantId',
            externalUserId: '$externalUserId'
          }
        }
      },
      { $count: 'total' }
    ]).exec();

    return {
      items,
      total: totalRows[0]?.total ?? 0
    };
  }
}
