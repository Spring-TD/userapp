import { Product, CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import {
  ProductConfiguration,
  CreateProductConfigurationRequest,
  UpdateProductConfigurationRequest
} from '../types/productConfiguration';
import { ProductModel, toProduct } from '../models/ProductModel';
import { ProductConfigurationModel, toProductConfiguration } from '../models/ProductConfigurationModel';
import type { IProductDocument } from '../models/ProductModel';
import type { IProductConfigurationDocument } from '../models/ProductConfigurationModel';

function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `PRD-${timestamp}-${random}`;
}

export class ProductService {
  async selectProductType(typeData: SelectProductTypeRequest): Promise<Product> {
    const now = new Date().toISOString();
    const doc = await ProductModel.create({
      referenceNumber: generateReferenceNumber(),
      name: '',
      description: '',
      type: typeData.type,
      appId: typeData.appId,
      status: 'incomplete',
      createdAt: now,
      updatedAt: now,
      ...(typeData.type === 'Mortgage' && { equityContribution: 0, propertyValue: 0 }),
      ...(typeData.type === 'Commodity' && { price: 0, minimumQuantity: 0, unitOfMeasure: '' })
    });
    return toProduct(doc as IProductDocument);
  }

  async createProductAfterType(productData: CreateProductAfterTypeRequest): Promise<Product | null> {
    const existing = await ProductModel.findById(productData.productId).lean();
    if (!existing) return null;
    const existingProduct = toProduct(existing as IProductDocument);
    const mortgageFields = existingProduct.type === 'Mortgage' ? { equityContribution: existingProduct.equityContribution, propertyValue: existingProduct.propertyValue } : {};
    const commodityFields = existingProduct.type === 'Commodity' ? { price: existingProduct.price, minimumQuantity: existingProduct.minimumQuantity, unitOfMeasure: existingProduct.unitOfMeasure } : {};
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
    const doc = await ProductModel.create({
      referenceNumber: generateReferenceNumber(),
      name: productData.name,
      description: productData.description,
      type: productData.type,
      appId: productData.appId,
      status: 'incomplete',
      createdAt: now,
      updatedAt: now,
      ...(productData.type === 'Mortgage' && { equityContribution: 0, propertyValue: 0 }),
      ...(productData.type === 'Commodity' && { price: 0, minimumQuantity: 0, unitOfMeasure: '' })
    });
    return toProduct(doc as IProductDocument);
  }

  async getProductById(id: string): Promise<Product | null> {
    const doc = await ProductModel.findById(id).lean();
    return doc ? toProduct(doc as IProductDocument) : null;
  }

  async updateProduct(id: string, updateData: UpdateProductRequest): Promise<Product | null> {
    const existing = await ProductModel.findById(id).lean();
    if (!existing) return null;
    const existingProduct = toProduct(existing as IProductDocument);
    const mortgageFields = existingProduct.type === 'Mortgage' ? {
      equityContribution: updateData.equityContribution !== undefined ? updateData.equityContribution : existingProduct.equityContribution,
      propertyValue: updateData.propertyValue !== undefined ? updateData.propertyValue : existingProduct.propertyValue
    } : {};
    const commodityFields = existingProduct.type === 'Commodity' ? {
      price: updateData.price !== undefined ? updateData.price : existingProduct.price,
      minimumQuantity: updateData.minimumQuantity !== undefined ? updateData.minimumQuantity : existingProduct.minimumQuantity,
      unitOfMeasure: updateData.unitOfMeasure !== undefined ? updateData.unitOfMeasure : existingProduct.unitOfMeasure
    } : {};
    const doc = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { ...updateData, ...mortgageFields, ...commodityFields, updatedAt: new Date().toISOString() } },
      { new: true }
    ).lean();
    return doc ? toProduct(doc as IProductDocument) : null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await ProductModel.findByIdAndDelete(id);
    return !!result;
  }

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    const docs = await ProductModel.find({ appId: merchantId }).lean();
    return docs.map((d) => toProduct(d as IProductDocument));
  }

  async getAllProducts(): Promise<Product[]> {
    const docs = await ProductModel.find({}).lean();
    return docs.map((d) => toProduct(d as IProductDocument));
  }

  async createProductConfiguration(configData: CreateProductConfigurationRequest): Promise<ProductConfiguration> {
    const product = await this.getProductById(configData.productId);
    if (!product) throw new Error('Product not found');
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      productId: configData.productId,
      createdAt: now,
      updatedAt: now,
      ...configData.configuration
    };
    const doc = await ProductConfigurationModel.create(payload);
    return toProductConfiguration(doc as IProductConfigurationDocument);
  }

  async getProductConfiguration(productId: string): Promise<ProductConfiguration | null> {
    const doc = await ProductConfigurationModel.findOne({ productId }).lean();
    return doc ? toProductConfiguration(doc as IProductConfigurationDocument) : null;
  }

  async updateProductConfiguration(productId: string, updateData: UpdateProductConfigurationRequest): Promise<ProductConfiguration | null> {
    const doc = await ProductConfigurationModel.findOneAndUpdate(
      { productId },
      { $set: { ...updateData.configuration, updatedAt: new Date().toISOString() } },
      { new: true }
    ).lean();
    return doc ? toProductConfiguration(doc as IProductConfigurationDocument) : null;
  }

  async deleteProductConfiguration(productId: string): Promise<boolean> {
    const result = await ProductConfigurationModel.findOneAndDelete({ productId });
    return !!result;
  }
}
