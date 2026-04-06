import { Product } from '../types/product';
import {
  ProductConfiguration,
  MerchantProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';
import axios from 'axios';
import { config } from '../config/environment';
import { ProductModel, toProduct } from '../models/ProductModel';
import { normalizeProductType } from '../utils/productType';

export class ProductService {
  /**
   * Plata gateway reads these headers only (no Authorization / Bearer).
   * Values come from PLATA_PUBLIC_KEY / PLATA_SECRET_KEY in env → forwarded to service-auth as public_key / secret_key.
   */
  private getUpstreamAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (config.plataPublicKey) headers['PLATA_PUBLIC_KEY'] = config.plataPublicKey;
    if (config.plataSecretKey) headers['PLATA_SECRET_KEY'] = config.plataSecretKey;
    return headers;
  }

  private logUpstreamError(context: string, error: unknown): void {
    if (axios.isAxiosError(error)) {
      console.error(context, error.response?.data ?? error.message);
    } else {
      console.error(context, error);
    }
  }

  private async fetchUpstreamProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products/${id}`, {
        headers: this.getUpstreamAuthHeaders()
      });
      return response.data.data || null;
    } catch (error) {
      this.logUpstreamError('Error fetching upstream product by ID from server:', error);
      return null;
    }
  }

  private async getLocalProductById(id: string): Promise<Product | null> {
    try {
      const doc = await ProductModel.findById(id);
      return doc ? toProduct(doc) : null;
    } catch {
      return null;
    }
  }

  private buildLocalProductPayload(product: Product, appId: string, isActive: boolean): Omit<Product, 'id'> {
    const now = new Date().toISOString();
    return {
      referenceNumber: product.referenceNumber,
      name: product.name,
      description: product.description ?? '',
      type: normalizeProductType(product.type),
      subType: product.subType,
      appId,
      status: product.status ?? 'incomplete',
      isActive,
      createdAt: product.createdAt || now,
      updatedAt: now,
      metadata: product.metadata,
      structure: product.structure,
      about: product.about,
      requirements: product.requirements,
      feesAndCharges: product.feesAndCharges,
      properties: product.properties,
      config: product.config,
      equityContribution: product.equityContribution,
      propertyValue: product.propertyValue,
      price: product.price,
      minimumQuantity: product.minimumQuantity,
      unitOfMeasure: product.unitOfMeasure,
      commodityPrices: product.commodityPrices
    };
  }

  private sanitizeProductUpdate(updateData: Partial<Product>): Partial<Omit<Product, 'id'>> {
    const next: Partial<Omit<Product, 'id'>> = {};
    const keys: Array<keyof Omit<Product, 'id'>> = [
      'name',
      'description',
      'type',
      'subType',
      'status',
      'isActive',
      'metadata',
      'structure',
      'about',
      'requirements',
      'feesAndCharges',
      'properties',
      'config',
      'equityContribution',
      'propertyValue',
      'price',
      'minimumQuantity',
      'unitOfMeasure',
      'commodityPrices'
    ];

    for (const key of keys) {
      if (updateData[key] !== undefined) {
        (next as Record<string, unknown>)[key] =
          key === 'type' && typeof updateData[key] === 'string'
            ? normalizeProductType(updateData[key] as string)
            : updateData[key];
      }
    }

    next.updatedAt = new Date().toISOString();
    return next;
  }

  private toLegacyConfigurationShape(product: Product): MerchantProductConfiguration {
    return {
      id: product.id,
      productId: product.id,
      appId: product.appId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  // Fetch all products from upstream: GET ${PLATA_ACCOUNT_SERVICE_URL}/api/v1/products
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products`, {
        headers: this.getUpstreamAuthHeaders()
      });
      return response.data.data || [];
    } catch (error) {
      this.logUpstreamError('Error fetching products from server:', error);
      return [];
    }
  }

  // Resolve local app-scoped products first, then fall back to upstream catalog.
  async getProductById(id: string): Promise<Product | null> {
    const localProduct = await this.getLocalProductById(id);
    if (localProduct) {
      return localProduct;
    }
    return this.fetchUpstreamProductById(id);
  }

  // Fetch products that have been persisted for a specific app in the local products collection.
  async getProductsByMerchant(appId: string): Promise<Product[]> {
    try {
      const docs = await ProductModel.find({ appId }).sort({ updatedAt: -1 });
      return docs.map((doc) => toProduct(doc));
    } catch (error) {
      console.error('Error fetching products by app ID from local database:', error);
      return [];
    }
  }

  async checkProductAction(id: string): Promise<any> {
    try {
      const response = await axios.get(`${config.plataAccountServiceUrl}/api/v1/products/${id}/action`, {
        headers: this.getUpstreamAuthHeaders()
      });
      return response.data.data || null;
    } catch (error) {
      this.logUpstreamError('Error checking product action from server:', error);
      return null;
    }
  }

  async createProductConfiguration(configData: CreateProductConfigurationRequest, appId: string): Promise<MerchantProductConfiguration> {
    const upstreamProduct = await this.fetchUpstreamProductById(configData.productId);
    if (!upstreamProduct) {
      throw new Error('Product not found');
    }

    const existing = await ProductModel.findOne({
      appId,
      referenceNumber: upstreamProduct.referenceNumber
    });

    if (existing) {
      return this.toLegacyConfigurationShape(toProduct(existing));
    }

    const created = await ProductModel.create(this.buildLocalProductPayload(upstreamProduct, appId, false));
    return this.toLegacyConfigurationShape(toProduct(created));
  }

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    const product = await this.getLocalProductById(productId);
    return product ? this.toLegacyConfigurationShape(product) : null;
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    const doc = await ProductModel.findByIdAndUpdate(
      productId,
      this.sanitizeProductUpdate(updateData.configuration as Partial<Product>),
      { new: true }
    );
    return doc ? this.toLegacyConfigurationShape(toProduct(doc)) : null;
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    const result = await ProductModel.deleteOne({ _id: productId });
    return result.deletedCount > 0;
  }

  // Returns the locally persisted app product document.
  async getMerchantProductConfiguration(appId: string, productId: string): Promise<Product | null> {
    const localProduct = await this.getLocalProductById(productId);
    if (localProduct && localProduct.appId === appId) {
      return localProduct;
    }

    const upstreamProduct = await this.fetchUpstreamProductById(productId);
    if (!upstreamProduct) {
      return null;
    }

    const doc = await ProductModel.findOne({
      appId,
      referenceNumber: upstreamProduct.referenceNumber
    });
    return doc ? toProduct(doc) : null;
  }

  // Activating clones the upstream product into the local products collection for that app.
  async toggleProductActivation(appId: string, productId: string, activate: boolean): Promise<Product | null> {
    const localProduct = await this.getMerchantProductConfiguration(appId, productId);

    if (localProduct) {
      const updated = await ProductModel.findByIdAndUpdate(
        localProduct.id,
        { $set: { isActive: activate, updatedAt: new Date().toISOString() } },
        { new: true }
      );
      return updated ? toProduct(updated) : null;
    }

    if (!activate) {
      return null;
    }

    const upstreamProduct = await this.fetchUpstreamProductById(productId);
    if (!upstreamProduct) {
      return null;
    }

    const created = await ProductModel.create(this.buildLocalProductPayload(upstreamProduct, appId, true));
    return toProduct(created);
  }

  // Updates the locally persisted app product document with Plata-shaped fields.
  async updateMerchantProductConfiguration(
    appId: string,
    productId: string,
    updateData: Partial<Product>
  ): Promise<Product | null> {
    const localProduct = await this.getMerchantProductConfiguration(appId, productId);
    if (!localProduct) {
      return null;
    }

    const updated = await ProductModel.findByIdAndUpdate(
      localProduct.id,
      this.sanitizeProductUpdate(updateData),
      { new: true }
    );
    return updated ? toProduct(updated) : null;
  }
}