import { Product, CreateProductRequest, UpdateProductRequest } from '../types/product';
import { 
  LoanProductConfiguration, 
  MortgageProductConfiguration, 
  SavingsProductConfiguration, 
  CommodityProductConfiguration, 
  CustomProductConfiguration,
  ProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';

export class ProductService {
  private products: Product[] = [];
  private productConfigurations: ProductConfiguration[] = [];

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
      updatedAt: new Date().toISOString()
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

    const updatedProduct = {
      ...this.products[productIndex],
      ...updateData,
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
      case 'Custom':
        newConfiguration = {
          id: this.generateId(),
          productId: configData.productId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...configData.configuration
        } as CustomProductConfiguration;
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