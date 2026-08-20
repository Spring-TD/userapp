import mongoose, { Document, Schema } from 'mongoose';
import type {
  ProductApplication,
  ProductApplicationProgress,
  ProductRequirementSubmission,
  PostApprovalFulfillment
} from '../types/productApplication';
import type { LoanRequirements } from '../types/product';
import type { ValidatedPlatformApplicationFields } from '../types/platformApplicationFields';
import { platformFieldsFromApplication } from '../utils/platformApplicationFieldInput';
import { applyCollateralRequirement } from '../utils/collateralRequirement';

export interface IProductApplicationDocument
  extends Omit<
      ProductApplication,
      'id' | 'createdAt' | 'updatedAt' | 'loanWorkflowLastEventAt' | 'applicationProgress' | 'platformFields'
    >,
    ValidatedPlatformApplicationFields,
    Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  loanWorkflowLastEventAt?: Date;
  applicationProgress?: Omit<ProductApplicationProgress, 'lastSavedAt'> & { lastSavedAt?: Date };
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
    balance: { type: Number },
    mainBalance: { type: Number },
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

const applicationProgressSchema = new Schema(
  {
    currentStep: { type: String },
    currentTab: { type: String },
    requirementDrafts: { type: [requirementSubmissionSchema], default: undefined },
    uploadedDrafts: { type: [requirementSubmissionSchema], default: undefined },
    guarantorDrafts: { type: [Schema.Types.Mixed], default: undefined },
    metadata: { type: Schema.Types.Mixed },
    lastSavedAt: { type: Date }
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
    applicationProgress: { type: applicationProgressSchema },
    requirementSubmissions: { type: [requirementSubmissionSchema], default: [] },
    productWallet: { type: productApplicationWalletSchema },
    upstreamApplicationId: { type: String },
    upstreamSyncError: { type: String },
    loanWorkflowLastEventId: { type: String },
    loanWorkflowLastEventAt: { type: Date },
    postApprovalFulfillment: { type: Schema.Types.Mixed },
    disbursementDeferred: { type: Boolean },
    amortizationSchedule: { type: Schema.Types.Mixed },
    applicantGuarantorReport: {
      guarantorId: { type: String },
      guarantorName: { type: String },
      reportedAt: { type: String }
    },
    isPoliticallyExposedPerson: { type: Boolean },
    monthlyIncome: { type: Number },
    repaymentSource: { type: String },
    repaymentSourceOther: { type: String },
    maritalStatus: { type: String },
    maritalStatusOther: { type: String },
    loanReason: { type: String },
    loanReasonOther: { type: String },
    repayingWithSpouse: { type: Boolean },
    spouseFullName: { type: String },
    spouseEmail: { type: String },
    spousePhone: { type: String },
    spouseOccupation: { type: String },
    spouseCountry: { type: String },
    occupation: { type: String },
    placeOfWork: { type: String },
    hrName: { type: String },
    hrEmail: { type: String }
  },
  {
    collection: 'product_applications',
    timestamps: true
  }
);

productApplicationSchema.index({ merchantId: 1, status: 1 });
productApplicationSchema.index({ userId: 1, productType: 1 });
productApplicationSchema.index({ userId: 1, productId: 1, merchantId: 1, status: 1 });
productApplicationSchema.index({ upstreamApplicationId: 1 });
productApplicationSchema.index({ userId: 1, productType: 1, 'postApprovalFulfillment.status': 1 });

export const ProductApplicationModel = mongoose.model<IProductApplicationDocument>(
  'ProductApplication',
  productApplicationSchema
);

function stringFrom(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function recordFrom(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function applicantNameFrom(doc: IProductApplicationDocument): string {
  const snapshot = recordFrom(doc.contractSnapshot);
  const applicant = recordFrom(snapshot?.applicant);
  return (
    stringFrom(applicant?.name) ||
    stringFrom(snapshot?.customerName) ||
    stringFrom(snapshot?.applicantName) ||
    (stringFrom(doc.email)?.split('@')[0].replace(/[._+-]+/g, ' ').trim()) ||
    doc.userId
  );
}

export function toProductApplication(doc: IProductApplicationDocument): ProductApplication {
  const applicantName = applicantNameFrom(doc);
  const platformFields = platformFieldsFromApplication(doc);
  const requirementsSnapshot = applyCollateralRequirement({
    requirements: doc.requirementsSnapshot as LoanRequirements | undefined
  });
  const existingContract =
    doc.contractSnapshot && typeof doc.contractSnapshot === 'object'
      ? (doc.contractSnapshot as Record<string, unknown>)
      : undefined;
  const contractRequirements = applyCollateralRequirement({
    requirements: (existingContract?.requirements as LoanRequirements | undefined) ?? requirementsSnapshot
  });
  const contractSnapshot = existingContract
    ? {
        ...existingContract,
        ...(contractRequirements !== undefined ? { requirements: contractRequirements } : {})
      }
    : existingContract;

  return {
    id: doc._id.toString(),
    userId: doc.userId,
    productId: doc.productId,
    productName: doc.productName,
    productType: doc.productType,
    amount: doc.amount,
    currency: doc.currency,
    email: doc.email,
    customerName: applicantName,
    applicantName,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    blacklistReason: doc.blacklistReason,
    appId: doc.appId,
    merchantId: doc.merchantId,
    requirementsSnapshot,
    contractSnapshot,
    loanWorkflowStatus: doc.loanWorkflowStatus,
    applicationProgress: progressFrom(doc.applicationProgress),
    requirementSubmissions: doc.requirementSubmissions as ProductRequirementSubmission[],
    productWallet: doc.productWallet,
    upstreamApplicationId: doc.upstreamApplicationId,
    upstreamSyncError: doc.upstreamSyncError,
    loanWorkflowLastEventId: doc.loanWorkflowLastEventId,
    loanWorkflowLastEventAt: doc.loanWorkflowLastEventAt?.toISOString(),
    postApprovalFulfillment: doc.postApprovalFulfillment as PostApprovalFulfillment | undefined,
    disbursementDeferred: doc.disbursementDeferred,
    amortizationSchedule: doc.amortizationSchedule,
    applicantGuarantorReport: doc.applicantGuarantorReport
      ? {
          guarantorId: doc.applicantGuarantorReport.guarantorId,
          guarantorName: doc.applicantGuarantorReport.guarantorName,
          reportedAt: doc.applicantGuarantorReport.reportedAt
        }
      : undefined,
    ...(Object.keys(platformFields).length > 0 ? { platformFields } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

function progressFrom(value: unknown): ProductApplicationProgress | undefined {
  const progress = recordFrom(value);
  if (!progress) {
    return undefined;
  }

  return {
    ...(typeof progress.currentStep === 'string' ? { currentStep: progress.currentStep } : {}),
    ...(typeof progress.currentTab === 'string' ? { currentTab: progress.currentTab } : {}),
    ...(Array.isArray(progress.requirementDrafts)
      ? { requirementDrafts: progress.requirementDrafts as ProductRequirementSubmission[] }
      : {}),
    ...(Array.isArray(progress.uploadedDrafts)
      ? { uploadedDrafts: progress.uploadedDrafts as ProductRequirementSubmission[] }
      : {}),
    ...(Array.isArray(progress.guarantorDrafts)
      ? { guarantorDrafts: progress.guarantorDrafts as Record<string, unknown>[] }
      : {}),
    ...(recordFrom(progress.metadata) ? { metadata: progress.metadata as Record<string, unknown> } : {}),
    ...(progress.lastSavedAt instanceof Date
      ? { lastSavedAt: progress.lastSavedAt.toISOString() }
      : typeof progress.lastSavedAt === 'string'
        ? { lastSavedAt: progress.lastSavedAt }
        : {})
  };
}
