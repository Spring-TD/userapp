import { Product, CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import {
  LoanProductConfiguration,
  MortgageProductConfiguration,
  SavingsProductConfiguration,
  CommodityProductConfiguration,
  ProductConfiguration,
  MerchantProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';
import axios from 'axios';
import { config } from '../config/environment';
import { db } from '../db/database';

export class ProductService {

  // Fetch all products from server product-ms
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await axios.get(`${config.serverProductServiceUrl}/api/v1/products`);
      const products = response.data.data || [];
      
      // Return products with default merchant configuration
      return products.map((product: Product) => ({
        ...product,
        merchantConfig: null
      }));
    } catch (error) {
      console.error('Error fetching products from server:', error);
      return [];
    }
  }

  // Fetch a single product by ID from server product-ms
  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await axios.get(`${config.serverProductServiceUrl}/api/v1/products/${id}`);
      const product = response.data.data || null;
      
      if (product) {
        return {
          ...product,
          merchantConfig: null
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching product by ID from server:', error);
      return null;
    }
  }

  // Fetch products by merchant ID from server product-ms
  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    try {
      const response = await axios.get(`${config.serverProductServiceUrl}/api/v1/products/app/${merchantId}`);
      const products = response.data.data || [];
      
      // Enhance products with merchant-specific configurations
      const enhancedProducts = await Promise.all(products.map(async (product: Product) => {
        const merchantConfig = await this.getMerchantProductConfiguration(merchantId, product.id);
        return {
          ...product,
          merchantConfig: merchantConfig || null
        };
      }));
      
      return enhancedProducts;
    } catch (error) {
      console.error('Error fetching products by app ID from server:', error);
      return [];
    }
  }

  // Check product action capability
  async checkProductAction(id: string): Promise<any> {
    try {
      const response = await axios.get(`${config.serverProductServiceUrl}/api/v1/products/${id}/action`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error checking product action from server:', error);
      return null;
    }
  }

  // Configuration management methods
  // Note: Actual product creation happens in server/product-ms
  // This service only handles merchant-specific configurations

  // Create merchant-specific product configuration (persisted in MongoDB)
  async createProductConfiguration(configData: CreateProductConfigurationRequest, merchantId: string): Promise<MerchantProductConfiguration> {
    return db.createMerchantConfiguration({
      productId: configData.productId,
      merchantId,
      isActive: false,
      pricingType: undefined,
      pricingCondition: undefined,
      upperCap: undefined,
      lowerCap: undefined,
      springTDFee: undefined,
      serviceFee: undefined,
      markupRate: 0,
      customTerms: {},
      enabledFeatures: []
    });
  }

  // Methods for actual product creation and updates are not implemented
  // as this service is read-only for product data
  // Product creation/update/delete happens in server/product-ms

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    return db.findConfigurationByProductId(productId);
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    // Update the first merchant config found for this product (configuration API has no merchantId)
    const existing = await db.findConfigurationByProductId(productId);
    if (!existing || !('merchantId' in existing)) return null;
    return db.updateMerchantConfiguration(
      existing.merchantId,
      productId,
      updateData.configuration ?? {}
    );
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    return db.deleteConfigurationByProductId(productId);
  }

  // Get merchant-specific product configuration
  async getMerchantProductConfiguration(merchantId: string, productId: string): Promise<MerchantProductConfiguration | null> {
    return db.findMerchantConfiguration(merchantId, productId);
  }

  // Toggle product activation for a merchant (persisted in MongoDB)
  async toggleProductActivation(merchantId: string, productId: string, activate: boolean): Promise<boolean> {
    await db.upsertMerchantConfiguration({
      productId,
      merchantId,
      isActive: activate,
      markupRate: 0,
      customTerms: {},
      enabledFeatures: []
    });
    return true;
  }

  // Update merchant-specific product configuration (e.g., interest rate adjustments) - persisted in MongoDB
  async updateMerchantProductConfiguration(
    merchantId: string,
    productId: string,
    updateData: Partial<MerchantProductConfiguration>
  ): Promise<MerchantProductConfiguration | null> {
    const updated = await db.updateMerchantConfiguration(merchantId, productId, updateData);
    if (updated) return updated;
    // Upsert if no existing config
    return db.upsertMerchantConfiguration({
      productId,
      merchantId,
      isActive: updateData.isActive ?? true,
      pricingType: updateData.pricingType,
      pricingCondition: updateData.pricingCondition,
      upperCap: updateData.upperCap,
      lowerCap: updateData.lowerCap,
      springTDFee: updateData.springTDFee,
      serviceFee: updateData.serviceFee,
      markupRate: updateData.markupRate ?? 0,
      customTerms: updateData.customTerms ?? {},
      enabledFeatures: updateData.enabledFeatures ?? []
    });
  }

}