import axios from 'axios';
import { Product, CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import { ProductModel, toProduct } from '../models/ProductModel';
import type { IProductDocument } from '../models/ProductModel';
import { deepMerge } from '../utils/deepMerge';
import { normalizeProductType } from '../utils/productType';
import { config } from '../config/environment';
import { resolveMerchantOwner } from './merchantOwnerService';

export type ProductCatalogListOptions = {
  page?: number;
  limit?: number;
  type?: string;
};

export type ProductCatalogListResult = {
  items: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type ProductMerchant = NonNullable<Product['merchant']>;

function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PRD-${timestamp}-${random}`;
}

function asPlainObjectRecord(value: unknown): Record<string, unknown> | undefined {
  if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export class ProductService {
  async selectProductType(typeData: SelectProductTypeRequest): Promise<Product> {
    const now = new Date().toISOString();
    const type = normalizeProductType(typeData.type);
    const doc = await ProductModel.create({
      referenceNumber: generateReferenceNumber(),
      name: '',
      description: '',
      type,
      appId: typeData.appId,
      status: 'incomplete',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...(type === 'MORTGAGE' && { equityContribution: 0, propertyValue: 0 })
    });
    return toProduct(doc as IProductDocument);
  }

  async createProductAfterType(productData: CreateProductAfterTypeRequest): Promise<Product | null> {
    const existing = await ProductModel.findById(productData.productId).lean();
    if (!existing) return null;
    const existingProduct = toProduct(existing as IProductDocument);
    const mortgageFields =
      existingProduct.type === 'MORTGAGE'
        ? { equityContribution: existingProduct.equityContribution, propertyValue: existingProduct.propertyValue }
        : {};
    const commodityFields =
      existingProduct.type === 'COMMODITY'
        ? {
            price: existingProduct.price,
            minimumQuantity: existingProduct.minimumQuantity,
            unitOfMeasure: existingProduct.unitOfMeasure,
            commodityPrices: existingProduct.commodityPrices
          }
        : {};
    const doc = await ProductModel.findByIdAndUpdate(
      productData.productId,
      {
        $set: {
          name: productData.name,
          description: productData.description,
          updatedAt: new Date().toISOString(),
          ...mortgageFields,
          ...commodityFields
        }
      },
      { new: true }
    ).lean();
    return doc ? toProduct(doc as IProductDocument) : null;
  }

  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const now = new Date().toISOString();
    const type = normalizeProductType(productData.type);
    const doc = await ProductModel.create({
      referenceNumber: generateReferenceNumber(),
      name: productData.name,
      description: productData.description,
      type,
      subType: productData.subType,
      appId: productData.appId,
      status: 'incomplete',
      isActive: productData.isActive !== false,
      createdAt: now,
      updatedAt: now,
      ...(productData.metadata !== undefined ? { metadata: productData.metadata } : {}),
      ...(type === 'MORTGAGE' && { equityContribution: 0, propertyValue: 0 }),
      ...(productData.structure !== undefined ? { structure: productData.structure } : {}),
      ...(productData.about !== undefined ? { about: productData.about } : {}),
      ...(productData.requirements !== undefined ? { requirements: productData.requirements } : {}),
      ...(productData.feesAndCharges !== undefined ? { feesAndCharges: productData.feesAndCharges } : {}),
      ...(productData.properties !== undefined ? { properties: productData.properties } : {}),
      ...(productData.commodityPrices !== undefined ? { commodityPrices: productData.commodityPrices } : {}),
      ...(productData.config !== undefined ? { config: productData.config } : {})
    });
    return toProduct(doc as IProductDocument);
  }

  async getProductById(id: string): Promise<Product | null> {
    const doc = await ProductModel.findById(id).lean();
    if (!doc) return null;
    const product = toProduct(doc as IProductDocument);
    if (product.merchant?.id) return product;
    const [enriched] = await this.enrichProductsWithMerchantDetails([product]);
    return enriched ?? product;
  }

  async updateProduct(id: string, updateData: UpdateProductRequest): Promise<Product | null> {
    const existing = await ProductModel.findById(id).lean();
    if (!existing) return null;
    const existingProduct = toProduct(existing as IProductDocument);
    const mortgageFields =
      existingProduct.type === 'MORTGAGE'
        ? {
            equityContribution:
              updateData.equityContribution !== undefined
                ? updateData.equityContribution
                : existingProduct.equityContribution,
            propertyValue:
              updateData.propertyValue !== undefined ? updateData.propertyValue : existingProduct.propertyValue
          }
        : {};
    const commodityFields =
      existingProduct.type === 'COMMODITY'
        ? {
            price: updateData.price !== undefined ? updateData.price : existingProduct.price,
            minimumQuantity:
              updateData.minimumQuantity !== undefined
                ? updateData.minimumQuantity
                : existingProduct.minimumQuantity,
            unitOfMeasure:
              updateData.unitOfMeasure !== undefined ? updateData.unitOfMeasure : existingProduct.unitOfMeasure
          }
        : {};

    const {
      structure: incomingStructure,
      config: incomingConfig,
      metadata: incomingMetadata,
      about: incomingAbout,
      requirements: incomingRequirements,
      feesAndCharges: incomingFeesAndCharges,
      properties: incomingProperties,
      commodityPrices: incomingCommodityPrices,
      type: incomingType,
      ...restUpdate
    } = updateData;

    const setPayload: Record<string, unknown> = {
      ...restUpdate,
      ...mortgageFields,
      ...commodityFields,
      updatedAt: new Date().toISOString()
    };

    if (incomingType !== undefined && incomingType !== null) {
      setPayload.type = normalizeProductType(incomingType);
    }

    if (incomingStructure !== undefined && typeof incomingStructure === 'object' && !Array.isArray(incomingStructure)) {
      setPayload.structure = deepMerge(
        asPlainObjectRecord(existingProduct.structure) ?? {},
        incomingStructure as Record<string, unknown>
      );
    }

    if (incomingAbout !== undefined && typeof incomingAbout === 'object' && !Array.isArray(incomingAbout)) {
      setPayload.about = deepMerge(
        asPlainObjectRecord(existingProduct.about) ?? {},
        incomingAbout as Record<string, unknown>
      );
    }

    if (
      incomingRequirements !== undefined &&
      typeof incomingRequirements === 'object' &&
      !Array.isArray(incomingRequirements)
    ) {
      setPayload.requirements = deepMerge(
        asPlainObjectRecord(existingProduct.requirements) ?? {},
        incomingRequirements as Record<string, unknown>
      );
    }

    if (
      incomingFeesAndCharges !== undefined &&
      typeof incomingFeesAndCharges === 'object' &&
      !Array.isArray(incomingFeesAndCharges)
    ) {
      setPayload.feesAndCharges = deepMerge(
        asPlainObjectRecord(existingProduct.feesAndCharges) ?? {},
        incomingFeesAndCharges as Record<string, unknown>
      );
    }

    if (incomingProperties !== undefined) {
      setPayload.properties = incomingProperties;
    }

    if (incomingCommodityPrices !== undefined) {
      setPayload.commodityPrices = incomingCommodityPrices;
    }

    if (incomingConfig !== undefined && typeof incomingConfig === 'object' && !Array.isArray(incomingConfig)) {
      setPayload.config = deepMerge(
        asPlainObjectRecord(existingProduct.config) ?? {},
        incomingConfig as Record<string, unknown>
      );
    }

    if (incomingMetadata !== undefined && typeof incomingMetadata === 'object' && !Array.isArray(incomingMetadata)) {
      setPayload.metadata = deepMerge(
        asPlainObjectRecord(existingProduct.metadata) ?? {},
        incomingMetadata as Record<string, unknown>
      );
    }

    const doc = await ProductModel.findByIdAndUpdate(id, { $set: setPayload }, { new: true }).lean();
    return doc ? toProduct(doc as IProductDocument) : null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await ProductModel.findByIdAndDelete(id);
    return !!result;
  }

  async getProductsByMerchant(
    appId: string,
    options: ProductCatalogListOptions = {}
  ): Promise<ProductCatalogListResult> {
    return this.getAllProducts({ ...options, appId });
  }

  async getAllProducts(
    options: ProductCatalogListOptions & { appId?: string } = {}
  ): Promise<ProductCatalogListResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const filter: Record<string, unknown> = {};
    if (options.appId?.trim()) {
      filter.appId = options.appId.trim();
    }
    if (options.type?.trim()) {
      filter.type = normalizeProductType(options.type);
    }

    const total = await ProductModel.countDocuments(filter);
    const docs = await ProductModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const products = docs.map((d) => toProduct(d as IProductDocument));
    const items = await this.enrichProductsWithMerchantDetails(products);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
  }

  /**
   * Attach product-creator merchant metadata for Spring turn-on / settlement.
   * Uses create-app (merchantId) + client-auth owner + compliance business info.
   */
  private async enrichProductsWithMerchantDetails(products: Product[]): Promise<Product[]> {
    if (!products.length) return products;

    const appCache = new Map<string, { merchantId: string; websiteUrl?: string } | null>();
    const merchantCache = new Map<string, ProductMerchant>();

    const resolveApp = async (appId: string) => {
      if (appCache.has(appId)) return appCache.get(appId) ?? null;
      try {
        const response = await axios.get<{
          success?: boolean;
          data?: { merchantId?: string; websiteUrl?: string; name?: string };
        }>(`${config.createAppServiceUrl}/internal/api/v1/apps/${encodeURIComponent(appId)}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': config.clientAuthInternalToken
          },
          timeout: 8000,
          validateStatus: () => true
        });
        const merchantId = response.data?.data?.merchantId?.trim();
        const value =
          response.status >= 200 && response.status < 300 && response.data?.success && merchantId
            ? { merchantId, websiteUrl: response.data.data?.websiteUrl }
            : null;
        appCache.set(appId, value);
        return value;
      } catch {
        appCache.set(appId, null);
        return null;
      }
    };

    const resolveMerchant = async (merchantId: string, websiteFallback?: string): Promise<ProductMerchant> => {
      if (merchantCache.has(merchantId)) return merchantCache.get(merchantId)!;

      let name: string | null = merchantId;
      let companyName: string | null = null;
      let companyLogoUrl: string | null = null;
      let website: string | null = websiteFallback?.trim() || null;

      // Match enrichment tests: optional contact endpoint, then owner + business-info.
      try {
        const contactRes = await axios.get<{
          success?: boolean;
          data?: { userId?: string; firstName?: string; lastName?: string; userName?: string };
        }>(`${config.clientAuthUrl}/internal/api/v1/users/${encodeURIComponent(merchantId)}/contact`, {
          headers: { 'X-Internal-Token': config.clientAuthInternalToken },
          timeout: 5000,
          validateStatus: () => true
        });
        const contact = contactRes.data?.data;
        if (contactRes.status < 300 && contactRes.data?.success && contact) {
          const personal = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
          if (personal) name = personal;
          else if (contact.userName?.trim()) name = contact.userName.trim();
        }
      } catch {
        // optional
      }

      const owner = await resolveMerchantOwner(merchantId);
      if (owner) {
        const personal = `${owner.firstName || ''} ${owner.lastName || ''}`.trim();
        if (personal) name = personal;
        const ownerUserId = owner.userId.trim();
        if (ownerUserId) {
          try {
            const bizRes = await axios.get<{
              success?: boolean;
              data?: { companyName?: string; companyLogoUrl?: string; website?: string };
            }>(
              `${config.complianceServiceUrl}/api/v1/kyc/internal/business-info/${encodeURIComponent(ownerUserId)}`,
              {
                headers: { 'X-Internal-Token': config.internalServiceToken },
                timeout: 5000,
                validateStatus: () => true
              }
            );
            const biz = bizRes.data?.data;
            if (bizRes.status < 300 && bizRes.data?.success && biz) {
              if (biz.companyName?.trim()) companyName = biz.companyName.trim();
              if (biz.companyLogoUrl?.trim()) companyLogoUrl = biz.companyLogoUrl.trim();
              if (biz.website?.trim()) website = biz.website.trim();
            }
          } catch {
            // optional
          }
        }
      }

      // Fallback: business-info keyed by merchantId (legacy)
      if (!companyName) {
        try {
          const bizRes = await axios.get<{
            success?: boolean;
            data?: { companyName?: string; companyLogoUrl?: string; website?: string };
          }>(
            `${config.complianceServiceUrl}/api/v1/kyc/internal/business-info/${encodeURIComponent(merchantId)}`,
            {
              headers: { 'X-Internal-Token': config.internalServiceToken },
              timeout: 5000,
              validateStatus: () => true
            }
          );
          const biz = bizRes.data?.data;
          if (bizRes.status < 300 && bizRes.data?.success && biz) {
            if (biz.companyName?.trim()) companyName = biz.companyName.trim();
            if (biz.companyLogoUrl?.trim()) companyLogoUrl = biz.companyLogoUrl.trim();
            if (biz.website?.trim()) website = biz.website.trim();
          }
        } catch {
          // optional
        }
      }

      const merchant: ProductMerchant = {
        id: merchantId,
        name,
        companyName,
        companyLogoUrl,
        website
      };
      merchantCache.set(merchantId, merchant);
      return merchant;
    };

    const enriched: Product[] = [];
    for (const product of products) {
      if (product.merchant?.id) {
        enriched.push(product);
        continue;
      }
      const appId = product.appId?.trim();
      if (!appId) {
        enriched.push(product);
        continue;
      }
      const app = await resolveApp(appId);
      if (!app?.merchantId) {
        enriched.push(product);
        continue;
      }
      const merchant = await resolveMerchant(app.merchantId, app.websiteUrl);
      enriched.push({ ...product, merchant });
    }
    return enriched;
  }
}
