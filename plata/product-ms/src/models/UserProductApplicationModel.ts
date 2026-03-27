import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  UserProductApplication,
  UserProductApplicationPayoutSplit
} from '../types/userProductApplication';
import { PRODUCT_DISCRIMINATORS } from '../utils/productType';

export interface IUserProductApplicationDocument
  extends Omit<UserProductApplication, 'id' | 'submittedAt' | 'signedAt' | 'createdAt'>,
    Document {
  _id: mongoose.Types.ObjectId;
  submittedAt: Date;
  signedAt?: Date;
  createdAt: Date;
}

const revenueLineSplitSchema = new Schema(
  {
    creatorShareBps: { type: Number, min: 0, max: 10000 },
    offeringMerchantShareBps: { type: Number, min: 0, max: 10000 }
  },
  { _id: false }
);

const payoutSplitSchema = new Schema<UserProductApplicationPayoutSplit>(
  {
    currency: { type: String },
    interest: { type: revenueLineSplitSchema },
    fees: { type: revenueLineSplitSchema },
    penalties: { type: revenueLineSplitSchema },
    yield: { type: revenueLineSplitSchema }
  },
  { _id: false }
);

const userProductApplicationSchema = new Schema<IUserProductApplicationDocument>(
  {
    appId: { type: String, required: true, index: true },
    merchantId: { type: String, required: true, index: true },
    merchantName: { type: String },
    offeringMerchantId: { type: String, required: true, index: true },
    offeringMerchantName: { type: String },
    userId: { type: String, required: true, index: true },
    productType: { type: String, required: true, enum: PRODUCT_DISCRIMINATORS },
    globalProductId: { type: String, required: true, index: true },
    globalProductReferenceNumber: { type: String },
    merchantProductId: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'signed', 'cancelled', 'withdrawn'],
      default: 'submitted'
    },
    submittedAt: { type: Date, required: true, default: Date.now },
    signedAt: { type: Date },
    contractSnapshot: { type: Schema.Types.Mixed, required: true },
    payoutSplit: { type: payoutSplitSchema, required: true, default: () => ({}) },
    snapshotVersion: { type: Number, required: true, default: 1 },
    snapshotHash: { type: String }
  },
  {
    collection: 'user_product_applications',
    timestamps: { createdAt: true, updatedAt: false }
  }
);

userProductApplicationSchema.index({ offeringMerchantId: 1, userId: 1, createdAt: -1 });
userProductApplicationSchema.index({ globalProductId: 1, offeringMerchantId: 1 });

let UserProductApplicationModel: Model<IUserProductApplicationDocument>;
if (mongoose.models.UserProductApplication) {
  UserProductApplicationModel = mongoose.models
    .UserProductApplication as Model<IUserProductApplicationDocument>;
} else {
  UserProductApplicationModel = mongoose.model<IUserProductApplicationDocument>(
    'UserProductApplication',
    userProductApplicationSchema
  );
}

export { UserProductApplicationModel };

export function toUserProductApplication(
  doc: IUserProductApplicationDocument | Record<string, unknown>
): UserProductApplication {
  const o =
    doc && typeof (doc as IUserProductApplicationDocument).toObject === 'function'
      ? (doc as IUserProductApplicationDocument).toObject()
      : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  const id = (raw._id as mongoose.Types.ObjectId | undefined)?.toString?.() ?? '';

  return {
    id,
    appId: String(raw.appId ?? ''),
    merchantId: String(raw.merchantId ?? ''),
    merchantName: raw.merchantName as string | undefined,
    offeringMerchantId: String(raw.offeringMerchantId ?? ''),
    offeringMerchantName: raw.offeringMerchantName as string | undefined,
    userId: String(raw.userId ?? ''),
    productType: raw.productType as UserProductApplication['productType'],
    globalProductId: String(raw.globalProductId ?? ''),
    globalProductReferenceNumber: raw.globalProductReferenceNumber as string | undefined,
    merchantProductId: raw.merchantProductId as string | undefined,
    status: raw.status as UserProductApplication['status'],
    submittedAt:
      raw.submittedAt instanceof Date
        ? raw.submittedAt.toISOString()
        : String(raw.submittedAt ?? ''),
    signedAt:
      raw.signedAt instanceof Date
        ? raw.signedAt.toISOString()
        : raw.signedAt != null
          ? String(raw.signedAt)
          : undefined,
    contractSnapshot: (raw.contractSnapshot ?? {}) as Record<string, unknown>,
    payoutSplit: (raw.payoutSplit ?? {}) as UserProductApplicationPayoutSplit,
    snapshotVersion: Number(raw.snapshotVersion ?? 1),
    snapshotHash: raw.snapshotHash as string | undefined,
    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt ?? '')
  };
}
