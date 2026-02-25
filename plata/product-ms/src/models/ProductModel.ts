import mongoose, { Schema, Document, Model } from 'mongoose';
import { Product } from '../types/product';

export interface IProductDocument extends Omit<Product, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    referenceNumber: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    appId: { type: String, required: true, index: true },
    status: { type: String, enum: ['complete', 'incomplete'], default: 'incomplete' },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    equityContribution: { type: Number },
    propertyValue: { type: Number },
    price: { type: Number },
    minimumQuantity: { type: Number },
    unitOfMeasure: { type: String }
  },
  { timestamps: false }
);

ProductSchema.index({ appId: 1 });

export const ProductModel: Model<IProductDocument> =
  mongoose.models.Product ?? mongoose.model<IProductDocument>('Product', ProductSchema);

export function toProduct(doc: IProductDocument | Record<string, unknown>): Product {
  const o = doc && typeof (doc as IProductDocument).toObject === 'function'
    ? (doc as IProductDocument).toObject()
    : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  return {
    id: (raw._id ?? (doc as IProductDocument)?._id)?.toString?.() ?? '',
    referenceNumber: raw.referenceNumber as string,
    name: raw.name as string,
    description: raw.description as string,
    type: raw.type as string,
    appId: raw.appId as string,
    status: raw.status as Product['status'],
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    equityContribution: raw.equityContribution as number | undefined,
    propertyValue: raw.propertyValue as number | undefined,
    price: raw.price as number | undefined,
    minimumQuantity: raw.minimumQuantity as number | undefined,
    unitOfMeasure: raw.unitOfMeasure as string | undefined
  };
}
