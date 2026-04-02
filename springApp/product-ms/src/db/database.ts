import mongoose from 'mongoose';
import MerchantProductConfigurationModel from './MerchantProductConfigurationModel';
import { MerchantProductConfiguration } from '../types/productConfiguration';

function docToMerchantConfig(
  doc: mongoose.Document | null
): MerchantProductConfiguration | null {
  if (!doc) return null;
  const o = doc.toObject() as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };
  const { _id, __v, createdAt, updatedAt, ...rest } = o;
  return {
    id: _id.toString(),
    ...rest,
    createdAt: (createdAt as Date).toISOString(),
    updatedAt: (updatedAt as Date).toISOString()
  } as MerchantProductConfiguration;
}

/**
 * Database layer for merchant product configurations - uses MongoDB via Mongoose.
 */
export const db = {
  async createMerchantConfiguration(
    data: Omit<MerchantProductConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MerchantProductConfiguration> {
    const doc = await MerchantProductConfigurationModel.create({
      productId: data.productId,
      appId: data.appId,
      isActive: data.isActive ?? false,
      pricingType: data.pricingType,
      pricingCondition: data.pricingCondition,
      upperCap: data.upperCap,
      lowerCap: data.lowerCap,
      springTDFee: data.springTDFee,
      serviceFee: data.serviceFee,
      markupRate: data.markupRate ?? 0,
      customTerms: data.customTerms ?? {},
      enabledFeatures: data.enabledFeatures ?? []
    });
    return docToMerchantConfig(doc)!;
  },

  async findMerchantConfiguration(
    appId: string,
    productId: string
  ): Promise<MerchantProductConfiguration | null> {
    const doc = await MerchantProductConfigurationModel.findOne({
      appId,
      productId
    });
    return docToMerchantConfig(doc);
  },

  async findConfigurationByProductId(
    productId: string
  ): Promise<MerchantProductConfiguration | null> {
    const doc = await MerchantProductConfigurationModel.findOne({ productId });
    return docToMerchantConfig(doc);
  },

  async findConfigurationsByMerchantId(
    appId: string
  ): Promise<MerchantProductConfiguration[]> {
    const docs = await MerchantProductConfigurationModel.find({ appId });
    return docs.map((d) => docToMerchantConfig(d)!).filter(Boolean);
  },

  async updateMerchantConfiguration(
    appId: string,
    productId: string,
    updates: Partial<Omit<MerchantProductConfiguration, 'id' | 'productId' | 'appId' | 'createdAt' | 'updatedAt'>>
  ): Promise<MerchantProductConfiguration | null> {
    const doc = await MerchantProductConfigurationModel.findOneAndUpdate(
      { appId, productId },
      { $set: updates },
      { new: true }
    );
    return docToMerchantConfig(doc);
  },

  async upsertMerchantConfiguration(
    data: Omit<MerchantProductConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MerchantProductConfiguration> {
    const doc = await MerchantProductConfigurationModel.findOneAndUpdate(
      { appId: data.appId, productId: data.productId },
      {
        $set: {
          isActive: data.isActive ?? false,
          pricingType: data.pricingType,
          pricingCondition: data.pricingCondition,
          upperCap: data.upperCap,
          lowerCap: data.lowerCap,
          springTDFee: data.springTDFee,
          serviceFee: data.serviceFee,
          markupRate: data.markupRate ?? 0,
          customTerms: data.customTerms ?? {},
          enabledFeatures: data.enabledFeatures ?? []
        }
      },
      { new: true, upsert: true }
    );
    return docToMerchantConfig(doc)!;
  },

  async deleteMerchantConfiguration(
    appId: string,
    productId: string
  ): Promise<boolean> {
    const result = await MerchantProductConfigurationModel.deleteOne({
      appId,
      productId
    });
    return result.deletedCount > 0;
  },

  /** Delete any configuration for a product (used by configuration API when only productId is provided) */
  async deleteConfigurationByProductId(productId: string): Promise<boolean> {
    const result = await MerchantProductConfigurationModel.deleteMany({ productId });
    return (result.deletedCount ?? 0) > 0;
  }
};
