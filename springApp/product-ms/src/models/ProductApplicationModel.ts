import mongoose, { Document, Schema } from 'mongoose';
import type { ProductApplication, ProductRequirementSubmission } from '../types/productApplication';
import type { LoanRequirements } from '../types/product';

export interface IProductApplicationDocument
  extends Omit<ProductApplication, 'id' | 'createdAt' | 'updatedAt'>,
    Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const requirementSubmissionSchema = new Schema(
  {
    requirementId: { type: String },
    requirementType: { type: String },
    label: { type: String },
    type: { type: String, enum: ['document', 'text', 'number', 'boolean', 'json'] },
    value: { type: Schema.Types.Mixed },
    fileUrl: { type: String },
    fileName: { type: String },
    fileType: { type: String },
    fileSize: { type: Number },
    metadata: { type: Schema.Types.Mixed }
  },
  { _id: false }
);

const productApplicationWalletSchema = new Schema(
  {
    walletId: { type: String, required: true },
    walletPurpose: { type: String },
    reusedUpstreamAccount: { type: Boolean },
    upstreamAccount: {
      accountNumber: { type: String },
      bankName: { type: String },
      bankCode: { type: String },
      providerReference: { type: String },
      provisionStatus: { type: String },
      provisionError: { type: String }
    }
  },
  { _id: false }
);

const productApplicationSchema = new Schema<IProductApplicationDocument>(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    productType: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    email: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLACKLISTED'],
      default: 'PENDING',
      index: true
    },
    rejectionReason: { type: String },
    blacklistReason: { type: String },
    appId: { type: String, required: true, index: true },
    merchantId: { type: String, index: true },
    requirementsSnapshot: { type: Schema.Types.Mixed },
    contractSnapshot: { type: Schema.Types.Mixed },
    loanWorkflowStatus: { type: String, index: true },
    requirementSubmissions: { type: [requirementSubmissionSchema], default: [] },
    productWallet: { type: productApplicationWalletSchema },
    upstreamApplicationId: { type: String },
    upstreamSyncError: { type: String }
  },
  {
    collection: 'product_applications',
    timestamps: true
  }
);

productApplicationSchema.index({ merchantId: 1, status: 1 });
productApplicationSchema.index({ userId: 1, productType: 1 });

export const ProductApplicationModel = mongoose.model<IProductApplicationDocument>(
  'ProductApplication',
  productApplicationSchema
);

export function toProductApplication(doc: IProductApplicationDocument): ProductApplication {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    productId: doc.productId,
    productName: doc.productName,
    productType: doc.productType,
    amount: doc.amount,
    currency: doc.currency,
    email: doc.email,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    blacklistReason: doc.blacklistReason,
    appId: doc.appId,
    merchantId: doc.merchantId,
    requirementsSnapshot: doc.requirementsSnapshot as LoanRequirements | undefined,
    contractSnapshot: doc.contractSnapshot as Record<string, unknown> | undefined,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    requirementSubmissions: doc.requirementSubmissions as ProductRequirementSubmission[],
    productWallet: doc.productWallet,
    upstreamApplicationId: doc.upstreamApplicationId,
    upstreamSyncError: doc.upstreamSyncError,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}
