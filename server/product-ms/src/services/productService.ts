import { Product, CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import {
  LoanProductConfiguration,
  MortgageProductConfiguration,
  SavingsProductConfiguration,
  CommodityProductConfiguration,
  InvestmentProductConfiguration,
  ProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';

export class ProductService {
  private products: Product[] = [];
  private productConfigurations: ProductConfiguration[] = [];

  // New method to select product type after receiving create-app ID
  async selectProductType(typeData: SelectProductTypeRequest): Promise<Product> {
    const newProduct: Product = {
      id: this.generateId(),
      referenceNumber: this.generateReferenceNumber(), // Added reference number
      name: '', // Will be set later
      description: '', // Will be set later
      type: typeData.type,
      appId: typeData.appId,
      status: 'incomplete', // Changed initial status to incomplete
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add mortgage-specific fields if type is Mortgage
      ...(typeData.type === 'Mortgage' && {
        equityContribution: 0,
        propertyValue: 0
      }),
      // Add commodity-specific fields if type is Commodity
      ...(typeData.type === 'Commodity' && {
        price: 0,
        minimumQuantity: 0,
        unitOfMeasure: ''
      })
    };

    this.products.push(newProduct);
    return newProduct;
  }

  // New method to create product after type selection
  async createProductAfterType(productData: CreateProductAfterTypeRequest): Promise<Product | null> {
    const productIndex = this.products.findIndex(p => p.id === productData.productId);

    if (productIndex === -1) {
      return null;
    }

    // Check if this is a mortgage product and if so, preserve the mortgage-specific fields
    const existingProduct = this.products[productIndex];
    const mortgageFields = existingProduct.type === 'Mortgage' ? {
      equityContribution: existingProduct.equityContribution,
      propertyValue: existingProduct.propertyValue
    } : {};

    // Check if this is a commodity product and if so, preserve the commodity-specific fields
    const commodityFields = existingProduct.type === 'Commodity' ? {
      price: existingProduct.price,
      minimumQuantity: existingProduct.minimumQuantity,
      unitOfMeasure: existingProduct.unitOfMeasure
    } : {};

    const updatedProduct = {
      ...this.products[productIndex],
      name: productData.name,
      description: productData.description,
      ...mortgageFields,
      ...commodityFields,
      updatedAt: new Date().toISOString()
    };

    this.products[productIndex] = updatedProduct;
    return updatedProduct;
  }

  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const newProduct: Product = {
      id: this.generateId(),
      referenceNumber: this.generateReferenceNumber(), // Added reference number
      name: productData.name,
      description: productData.description,
      type: productData.type, // Changed from category to type
      appId: productData.appId, // Added create-app ID
      status: 'incomplete', // Changed initial status to incomplete
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add mortgage-specific fields if type is Mortgage
      ...(productData.type === 'Mortgage' && {
        equityContribution: 0,
        propertyValue: 0
      }),
      // Add commodity-specific fields if type is Commodity
      ...(productData.type === 'Commodity' && {
        price: 0,
        minimumQuantity: 0,
        unitOfMeasure: ''
      })
    };

    this.products.push(newProduct);
    return newProduct;
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = this.products.find(p => p.id === id);
    return product || null;
  }

  async updateProduct(id: string, updateData: UpdateProductRequest): Promise<Product | null> {
    const productIndex = this.products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return null;
    }

    // Preserve existing mortgage fields if not being updated
    const existingProduct = this.products[productIndex];
    const mortgageFields = existingProduct.type === 'Mortgage' ? {
      equityContribution: updateData.equityContribution !== undefined ? updateData.equityContribution : existingProduct.equityContribution,
      propertyValue: updateData.propertyValue !== undefined ? updateData.propertyValue : existingProduct.propertyValue
    } : {};

    // Preserve existing commodity fields if not being updated
    const commodityFields = existingProduct.type === 'Commodity' ? {
      price: updateData.price !== undefined ? updateData.price : existingProduct.price,
      minimumQuantity: updateData.minimumQuantity !== undefined ? updateData.minimumQuantity : existingProduct.minimumQuantity,
      unitOfMeasure: updateData.unitOfMeasure !== undefined ? updateData.unitOfMeasure : existingProduct.unitOfMeasure
    } : {};

    const updatedProduct = {
      ...this.products[productIndex],
      ...updateData,
      ...mortgageFields,
      ...commodityFields,
      updatedAt: new Date().toISOString()
    };

    this.products[productIndex] = updatedProduct;
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const productIndex = this.products.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return false;
    }

    this.products.splice(productIndex, 1);
    return true;
  }

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    return this.products.filter(p => p.appId === merchantId);
  }

  async getAllProducts(): Promise<Product[]> {
    return this.products;
  }

  // Configuration management methods
  async createProductConfiguration(configData: CreateProductConfigurationRequest): Promise<ProductConfiguration> {
    // Validate that the product exists
    const product = this.products.find(p => p.id === configData.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    let newConfiguration: ProductConfiguration;

    // Create configuration based on product type
    switch (product.type) {
      case 'Loan':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as LoanProductConfiguration;
        break;
      case 'Mortgage':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as MortgageProductConfiguration;
        break;
      case 'Savings':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as SavingsProductConfiguration;
        break;
      case 'Commodity':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as CommodityProductConfiguration;
        break;
      case 'Investment':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as InvestmentProductConfiguration;
        break;
      default:
        throw new Error('Unsupported product type');
    }

    this.productConfigurations.push(newConfiguration);
    return newConfiguration;
  }

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    const configuration = this.productConfigurations.find(c => c.productId === productId);
    return configuration || null;
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    const configIndex = this.productConfigurations.findIndex(c => c.productId === productId);

    if (configIndex === -1) {
      return null;
    }

    const updatedConfiguration = {
      ...this.productConfigurations[configIndex],
      ...updateData.configuration,
      updatedAt: new Date().toISOString()
    };

    this.productConfigurations[configIndex] = updatedConfiguration as ProductConfiguration;
    return updatedConfiguration;
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    const configIndex = this.productConfigurations.findIndex(c => c.productId === productId);

    if (configIndex === -1) {
      return false;
    }

    this.productConfigurations.splice(configIndex, 1);
    return true;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Generate a unique reference number for each product
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substr(2, 4).toUpperCase(); // 4 random characters
    return `PRD-${timestamp}-${random}`;
  }
}