import mongoose, { Schema, Document, Model } from 'mongoose';
import { ProductConfiguration } from '../types/productConfiguration';

export interface IProductConfigurationDocument extends Document {
  productId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

const ProductConfigurationSchema = new Schema<IProductConfigurationDocument>(
  {
    productId: { type: String, required: true, unique: true, index: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true }
  },
  { timestamps: false, strict: false }
);

export const ProductConfigurationModel: Model<IProductConfigurationDocument> =
  mongoose.models.ProductConfiguration ?? mongoose.model<IProductConfigurationDocument>('ProductConfiguration', ProductConfigurationSchema);

export function toProductConfiguration(doc: IProductConfigurationDocument | Record<string, unknown>): ProductConfiguration {
  const o = doc && typeof (doc as IProductConfigurationDocument).toObject === 'function'
    ? (doc as IProductConfigurationDocument).toObject()
    : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  const { _id, __v, productId, createdAt, updatedAt, ...rest } = raw;
  return {
    id: (_id ?? (doc as IProductConfigurationDocument)?._id)?.toString?.() ?? '',
    productId: productId as string,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
    ...rest
  } as ProductConfiguration;
}
