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

export class ProductService {
  private productConfigurations: ProductConfiguration[] = [];

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

  // Create merchant-specific product configuration
  async createProductConfiguration(configData: CreateProductConfigurationRequest, merchantId: string): Promise<MerchantProductConfiguration> {
    // This method creates merchant-specific configurations only, not the actual products
    // Products are created in the server folder's product service
    const newConfiguration: MerchantProductConfiguration = {
      id: this.generateId(),
      productId: configData.productId,
      merchantId,
      isActive: false, // Default to inactive
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Pricing configuration defaults
      pricingType: undefined,
      pricingCondition: undefined,
      upperCap: undefined,
      lowerCap: undefined,
      springTDFee: undefined,
      serviceFee: undefined,
      markupRate: 0,
      customTerms: {},
      enabledFeatures: []
    };

    this.productConfigurations.push(newConfiguration);
    return newConfiguration;
  }

  // Methods for actual product creation and updates are not implemented
  // as this service is read-only for product data
  // Product creation/update/delete happens in server/product-ms

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    const configuration = this.productConfigurations.find(c => c.productId === productId);
    return configuration || null;
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    // This method is not used in the read-only service
    // Use updateMerchantProductConfiguration for merchant-specific configs
    return null;
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    // This method is not used in the read-only service
    return false;
  }

  // Get merchant-specific product configuration
  async getMerchantProductConfiguration(merchantId: string, productId: string): Promise<MerchantProductConfiguration | null> {
    const configuration = this.productConfigurations.find(
      (c): c is MerchantProductConfiguration => 
        'merchantId' in c && c.merchantId === merchantId && c.productId === productId
    );
    return configuration || null;
  }

  // Toggle product activation for a merchant
  async toggleProductActivation(merchantId: string, productId: string, activate: boolean): Promise<boolean> {
    const existingConfig = this.productConfigurations.find(
      (c): c is MerchantProductConfiguration => 
        'merchantId' in c && c.merchantId === merchantId && c.productId === productId
    );
    
    if (existingConfig) {
      existingConfig.isActive = activate;
      existingConfig.updatedAt = new Date().toISOString();
      return true;
    } else {
      // Create new configuration for this merchant/product combination
      const newConfiguration: MerchantProductConfiguration = {
        id: this.generateId(),
        productId,
        merchantId,
        isActive: activate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Pricing configuration defaults
        pricingType: undefined,
        pricingCondition: undefined,
        upperCap: undefined,
        lowerCap: undefined,
        springTDFee: undefined,
        serviceFee: undefined,
        markupRate: 0,
        customTerms: {},
        enabledFeatures: []
      };
      
      this.productConfigurations.push(newConfiguration);
      return true;
    }
  }

  // Update merchant-specific product configuration (e.g., interest rate adjustments)
  async updateMerchantProductConfiguration(
    merchantId: string, 
    productId: string, 
    updateData: Partial<MerchantProductConfiguration>
  ): Promise<MerchantProductConfiguration | null> {
    const configIndex = this.productConfigurations.findIndex(
      (c): c is MerchantProductConfiguration => 
        'merchantId' in c && c.merchantId === merchantId && c.productId === productId
    );

    if (configIndex === -1) {
      // Create new configuration if it doesn't exist
      const newConfiguration: MerchantProductConfiguration = {
        id: this.generateId(),
        productId,
        merchantId,
        isActive: true, // Default to active
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Pricing configuration defaults
        pricingType: undefined,
        pricingCondition: undefined,
        upperCap: undefined,
        lowerCap: undefined,
        springTDFee: undefined,
        serviceFee: undefined,
        markupRate: 0,
        customTerms: {},
        enabledFeatures: [],
        ...updateData
      };
      
      this.productConfigurations.push(newConfiguration);
      return newConfiguration;
    }

    const existingConfig = this.productConfigurations[configIndex] as MerchantProductConfiguration;
    
    const updatedConfiguration: MerchantProductConfiguration = {
      id: existingConfig.id,
      productId: existingConfig.productId,
      merchantId: existingConfig.merchantId,
      isActive: updateData.isActive ?? existingConfig.isActive,
      // Pricing configuration - preserve existing values if not provided
      pricingType: updateData.pricingType ?? existingConfig.pricingType,
      pricingCondition: updateData.pricingCondition ?? existingConfig.pricingCondition,
      upperCap: updateData.upperCap ?? existingConfig.upperCap,
      lowerCap: updateData.lowerCap ?? existingConfig.lowerCap,
      springTDFee: updateData.springTDFee ?? existingConfig.springTDFee,
      serviceFee: updateData.serviceFee ?? existingConfig.serviceFee,
      markupRate: updateData.markupRate ?? existingConfig.markupRate,
      customTerms: updateData.customTerms ?? existingConfig.customTerms,
      enabledFeatures: updateData.enabledFeatures ?? existingConfig.enabledFeatures,
      createdAt: existingConfig.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.productConfigurations[configIndex] = updatedConfiguration;
    return updatedConfiguration;
  }

  private getDefaultConfiguration(productId: string): Partial<ProductConfiguration> {
    // Return default configuration values
    return {
      isActive: false,
      // Pricing configuration defaults
      pricingType: undefined,
      pricingCondition: undefined,
      upperCap: undefined,
      lowerCap: undefined,
      springTDFee: undefined,
      serviceFee: undefined,
      markupRate: 0, // Default markup is 0%
      customTerms: {},
      enabledFeatures: []
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}