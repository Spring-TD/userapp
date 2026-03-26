import { Product, CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import { ProductModel, toProduct } from '../models/ProductModel';
import type { IProductDocument } from '../models/ProductModel';
import { deepMerge } from '../utils/deepMerge';
import { normalizeProductType } from '../utils/productType';

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
    return doc ? toProduct(doc as IProductDocument) : null;
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

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    const docs = await ProductModel.find({ appId: merchantId }).lean();
    return docs.map((d) => toProduct(d as IProductDocument));
  }

  async getAllProducts(): Promise<Product[]> {
    const docs = await ProductModel.find({}).lean();
    return docs.map((d) => toProduct(d as IProductDocument));
  }
}
