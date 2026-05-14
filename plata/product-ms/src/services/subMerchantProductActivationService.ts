import { ProductModel } from '../models/ProductModel';
import { SubMerchantProductActivationModel } from '../models/SubMerchantProductActivationModel';
import { SubMerchantProductUsageEventModel } from '../models/SubMerchantProductUsageEventModel';
import type {
  SubMerchantComplianceDocument,
  SubMerchantComplianceStatus,
  SubMerchantProductActivation,
  SubMerchantProductActivationStatus
} from '../types/subMerchantProductActivation';
import { normalizeComplianceFields } from '../utils/subMerchantCompliance';
import type {
  ListSubMerchantMerchantDashboardResponse,
  SubMerchantMerchantDashboardRow
} from '../types/subMerchantDashboard';

export interface UpsertSubMerchantActivationInput {
  plataMerchantId: string;
  apiKeyId?: string;
  gatewayEnvironment?: string;
  appId: string;
  productId: string;
  productName?: string;
  /** Merchant that owns / parents the sub-merchant (same domain as your merchants; may align with plataMerchantId) */
  merchantId: string;
  merchantName: string;
  subMerchant: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  status: 'active' | 'deactivated';
  /** Integrator-reported compliance on their platform; synced to all activations for this sub-merchant when set. */
  complianceStatus?: SubMerchantComplianceStatus;
  complianceDocuments?: SubMerchantComplianceDocument[];
}

export interface ListSubMerchantMerchantDashboardInput {
  appId: string;
  merchantId: string;
  status?: 'active' | 'deactivated';
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
  status: 'active' | 'deactivated';
  complianceStatus?: SubMerchantComplianceStatus | null;
  complianceDocuments?: SubMerchantComplianceDocument[] | null;
  createdAt: Date;
  updatedAt: Date;
}): SubMerchantProductActivation {
  const comp = normalizeComplianceFields({
    complianceStatus: doc.complianceStatus,
    complianceDocuments: doc.complianceDocuments
  });
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
    status: doc.status,
    complianceStatus: comp.complianceStatus,
    complianceDocuments: comp.complianceDocuments,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  };
}

export class SubMerchantProductActivationService {
  async upsert(input: UpsertSubMerchantActivationInput): Promise<SubMerchantProductActivation> {
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

    const filter = {
      plataMerchantId: input.plataMerchantId,
      appId: input.appId,
      productId: input.productId,
      merchantId,
      subMerchantId: input.subMerchant.id.trim()
    };

    const setDoc: Record<string, unknown> = {
      plataMerchantId: input.plataMerchantId,
      appId: input.appId,
      productId: input.productId,
      merchantId,
      merchantName,
      subMerchantId: input.subMerchant.id.trim(),
      subMerchantName: input.subMerchant.name.trim(),
      subMerchantEmail: input.subMerchant.email.trim(),
      subMerchantPhone: input.subMerchant.phone.trim(),
      status: input.status,
      ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
      ...(input.gatewayEnvironment ? { gatewayEnvironment: input.gatewayEnvironment } : {}),
      ...(productNameSnapshot ? { productNameSnapshot: productNameSnapshot } : {}),
      ...(input.complianceStatus !== undefined ? { complianceStatus: input.complianceStatus } : {}),
      ...(input.complianceDocuments !== undefined
        ? { complianceDocuments: input.complianceDocuments }
        : {})
    };

    const doc = await SubMerchantProductActivationModel.findOneAndUpdate(
      filter,
      { $set: setDoc },
      { new: true, upsert: true, runValidators: true }
    ).exec();

    if (!doc) {
      throw new Error('Failed to save sub-merchant product activation');
    }

    if (input.complianceStatus !== undefined || input.complianceDocuments !== undefined) {
      const sync: Record<string, unknown> = {};
      if (input.complianceStatus !== undefined) sync.complianceStatus = input.complianceStatus;
      if (input.complianceDocuments !== undefined) sync.complianceDocuments = input.complianceDocuments;
      await SubMerchantProductActivationModel.updateMany(
        {
          plataMerchantId: input.plataMerchantId,
          appId: input.appId,
          merchantId,
          subMerchantId: input.subMerchant.id.trim()
        },
        { $set: sync }
      ).exec();
    }

    return toApiShape(doc);
  }

  async listMerchantDashboard(
    input: ListSubMerchantMerchantDashboardInput
  ): Promise<ListSubMerchantMerchantDashboardResponse> {
    const baseMatch: Record<string, unknown> = {
      appId: input.appId,
      merchantId: input.merchantId
    };

    const search = input.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      baseMatch.$or = [
        { subMerchantName: { $regex: escaped, $options: 'i' } },
        { subMerchantEmail: { $regex: escaped, $options: 'i' } },
        { subMerchantPhone: { $regex: escaped, $options: 'i' } }
      ];
    }

    const activationGroups = await SubMerchantProductActivationModel.aggregate<{
      subMerchantId: string;
      subMerchantName: string;
      subMerchantEmail: string;
      subMerchantPhone: string;
      merchantId: string;
      merchantName: string;
      plataMerchantId: string;
      complianceStatus?: SubMerchantComplianceStatus | null;
      complianceDocuments?: SubMerchantComplianceDocument[] | null;
      activeProductsCount: number;
      products: {
        productId: string;
        productNameSnapshot?: string;
        status: 'active' | 'deactivated';
        updatedAt: Date;
      }[];
      createdAt: Date;
      updatedAt: Date;
    }>([
      { $match: baseMatch },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: '$subMerchantId',
          subMerchantId: { $first: '$subMerchantId' },
          subMerchantName: { $first: '$subMerchantName' },
          subMerchantEmail: { $first: '$subMerchantEmail' },
          subMerchantPhone: { $first: '$subMerchantPhone' },
          merchantId: { $first: '$merchantId' },
          merchantName: { $first: '$merchantName' },
          plataMerchantId: { $first: '$plataMerchantId' },
          complianceStatus: { $first: '$complianceStatus' },
          complianceDocuments: { $first: '$complianceDocuments' },
          activeProductsCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          products: {
            $push: {
              productId: '$productId',
              productNameSnapshot: '$productNameSnapshot',
              status: '$status',
              updatedAt: '$updatedAt'
            }
          },
          createdAt: { $min: '$createdAt' },
          updatedAt: { $max: '$updatedAt' }
        }
      }
    ]).exec();

    const filteredGroups =
      input.status === undefined
        ? activationGroups
        : activationGroups.filter((row) =>
            input.status === 'active' ? row.activeProductsCount > 0 : row.activeProductsCount === 0
          );

    const subMerchantIds = filteredGroups.map((row) => row.subMerchantId);
    let usageBySubMerchant = new Map<
      string,
      { usageEventsCount: number; latestStartedAt?: Date; latestUsageAt?: Date }
    >();
    if (subMerchantIds.length > 0) {
      const usageAgg = await SubMerchantProductUsageEventModel.aggregate<{
        subMerchantId: string;
        usageEventsCount: number;
        latestStartedAt?: Date;
        latestUsageAt?: Date;
      }>([
        {
          $match: {
            appId: input.appId,
            merchantId: input.merchantId,
            subMerchantId: { $in: subMerchantIds }
          }
        },
        {
          $group: {
            _id: '$subMerchantId',
            subMerchantId: { $first: '$subMerchantId' },
            usageEventsCount: { $sum: 1 },
            latestStartedAt: { $max: '$startedAt' },
            latestUsageAt: { $max: '$updatedAt' }
          }
        }
      ]).exec();

      usageBySubMerchant = new Map(
        usageAgg.map((row) => [
          row.subMerchantId,
          {
            usageEventsCount: row.usageEventsCount,
            latestStartedAt: row.latestStartedAt,
            latestUsageAt: row.latestUsageAt
          }
        ])
      );
    }

    const rows: SubMerchantMerchantDashboardRow[] = filteredGroups
      .map((row) => {
        const usage = usageBySubMerchant.get(row.subMerchantId);
        const latestUsageAt = usage?.latestUsageAt;
        const lastActivityAt =
          latestUsageAt && latestUsageAt.getTime() > row.updatedAt.getTime() ? latestUsageAt : row.updatedAt;
        const status: SubMerchantProductActivationStatus =
          row.activeProductsCount > 0 ? 'active' : 'deactivated';
        const comp = normalizeComplianceFields({
          complianceStatus: row.complianceStatus,
          complianceDocuments: row.complianceDocuments
        });
        return {
          subMerchantId: row.subMerchantId,
          subMerchantName: row.subMerchantName,
          subMerchantEmail: row.subMerchantEmail,
          subMerchantPhone: row.subMerchantPhone,
          merchantId: row.merchantId,
          merchantName: row.merchantName,
          plataMerchantId: row.plataMerchantId,
          status,
          complianceStatus: comp.complianceStatus,
          complianceDocuments: comp.complianceDocuments,
          activeProductsCount: row.activeProductsCount,
          productsCount: row.products.length,
          products: row.products,
          usageEventsCount: usage?.usageEventsCount ?? 0,
          latestStartedAt: usage?.latestStartedAt,
          latestUsageAt,
          lastActivityAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        };
      })
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    return {
      items: rows.slice(input.skip, input.skip + input.limit),
      total: rows.length
    };
  }
}
