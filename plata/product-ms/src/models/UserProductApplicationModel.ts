import mongoose, { Schema, Document, Model } from 'mongoose';
import type {
  LoanWorkflowStatus,
  UserProductApplication,
  UserProductApplicationPayoutSplit
} from '../types/userProductApplication';
import { PRODUCT_DISCRIMINATORS } from '../utils/productType';

const LOAN_WORKFLOW_STATUSES: LoanWorkflowStatus[] = [
  'requested',
  'under_review',
  'approved',
  'declined',
  'blacklisted'
];

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
    externalPlatformMerchantId: { type: String, index: true },
    externalPlatformMerchantName: { type: String },
    userId: { type: String, required: true, index: true },
    customerName: { type: String },
    productType: { type: String, required: true, enum: PRODUCT_DISCRIMINATORS },
    globalProductId: { type: String, required: true, index: true },
    productName: { type: String },
    globalProductReferenceNumber: { type: String },
    localApplicationId: { type: String, index: true },
    merchantProductId: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'submitted', 'signed', 'cancelled', 'withdrawn'],
      default: 'submitted'
    },
    loanWorkflowStatus: {
      type: String,
      enum: LOAN_WORKFLOW_STATUSES,
      index: true
    },
    loanWorkflowReason: { type: String },
    loanWorkflowCallbackUrl: { type: String },
    guarantorKycCallbackUrl: { type: String },
    submittedAt: { type: Date, required: true, default: Date.now },
    signedAt: { type: Date },
    contractSnapshot: { type: Schema.Types.Mixed, required: true },
    payoutSplit: { type: payoutSplitSchema, required: true, default: () => ({}) },
    snapshotVersion: { type: Number, required: true, default: 1 },
    snapshotHash: { type: String },
    submittedRequirements: { type: [Schema.Types.Mixed], default: undefined },
    applicantSignatureUrl: { type: String },
    applicantSignatureKey: { type: String },
    applicantSignatureFileName: { type: String },
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
    hrEmail: { type: String },
    applicantProfileSnapshot: { type: Schema.Types.Mixed },
    approvedLoanAmount: { type: Number },
    loanDisbursement: { type: Schema.Types.Mixed },
    equityPayment: { type: Schema.Types.Mixed },
    postApprovalFulfillment: { type: Schema.Types.Mixed }
  },
  {
    collection: 'user_product_applications',
    timestamps: { createdAt: true, updatedAt: false }
  }
);

userProductApplicationSchema.index({ offeringMerchantId: 1, userId: 1, createdAt: -1 });
userProductApplicationSchema.index({ globalProductId: 1, offeringMerchantId: 1 });
userProductApplicationSchema.index({ merchantId: 1, productType: 1, loanWorkflowStatus: 1, createdAt: -1 });
userProductApplicationSchema.index({
  externalPlatformMerchantId: 1,
  localApplicationId: 1,
  createdAt: -1
});

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

function optionalString(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function optionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

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
    merchantName: optionalString(raw.merchantName),
    offeringMerchantId: String(raw.offeringMerchantId ?? ''),
    offeringMerchantName: optionalString(raw.offeringMerchantName),
    externalPlatformMerchantId: optionalString(raw.externalPlatformMerchantId),
    externalPlatformMerchantName: optionalString(raw.externalPlatformMerchantName),
    userId: String(raw.userId ?? ''),
    customerName: optionalString(raw.customerName),
    productType: raw.productType as UserProductApplication['productType'],
    globalProductId: String(raw.globalProductId ?? ''),
    productName: optionalString(raw.productName),
    globalProductReferenceNumber: optionalString(raw.globalProductReferenceNumber),
    localApplicationId: optionalString(raw.localApplicationId),
    merchantProductId: optionalString(raw.merchantProductId),
    status: raw.status as UserProductApplication['status'],
    loanWorkflowStatus: (() => {
      const s = raw.loanWorkflowStatus as LoanWorkflowStatus | undefined | null;
      if (s) return s;
      const pt = String(raw.productType ?? '');
      if (pt === 'LOAN' || pt === 'MORTGAGE') return 'requested';
      return undefined;
    })(),
    loanWorkflowReason: optionalString(raw.loanWorkflowReason),
    loanWorkflowCallbackUrl: optionalString(raw.loanWorkflowCallbackUrl),
    guarantorKycCallbackUrl: optionalString(raw.guarantorKycCallbackUrl),
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
    snapshotHash: optionalString(raw.snapshotHash),
    submittedRequirements: Array.isArray(raw.submittedRequirements)
      ? (raw.submittedRequirements as UserProductApplication['submittedRequirements'])
      : undefined,
    applicantSignatureUrl: optionalString(raw.applicantSignatureUrl),
    applicantSignatureKey: optionalString(raw.applicantSignatureKey),
    applicantSignatureFileName: optionalString(raw.applicantSignatureFileName),
    isPoliticallyExposedPerson: optionalBoolean(raw.isPoliticallyExposedPerson),
    monthlyIncome: optionalNumber(raw.monthlyIncome),
    repaymentSource: raw.repaymentSource as UserProductApplication['repaymentSource'],
    repaymentSourceOther: optionalString(raw.repaymentSourceOther),
    maritalStatus: raw.maritalStatus as UserProductApplication['maritalStatus'],
    maritalStatusOther: optionalString(raw.maritalStatusOther),
    loanReason: raw.loanReason as UserProductApplication['loanReason'],
    loanReasonOther: optionalString(raw.loanReasonOther),
    repayingWithSpouse: optionalBoolean(raw.repayingWithSpouse),
    spouseFullName: optionalString(raw.spouseFullName),
    spouseEmail: optionalString(raw.spouseEmail),
    spousePhone: optionalString(raw.spousePhone),
    spouseOccupation: optionalString(raw.spouseOccupation),
    spouseCountry: optionalString(raw.spouseCountry),
    occupation: optionalString(raw.occupation),
    placeOfWork: optionalString(raw.placeOfWork),
    hrName: optionalString(raw.hrName),
    hrEmail: optionalString(raw.hrEmail),
    applicantProfileSnapshot:
      raw.applicantProfileSnapshot !== undefined &&
      raw.applicantProfileSnapshot !== null &&
      typeof raw.applicantProfileSnapshot === 'object'
        ? (raw.applicantProfileSnapshot as Record<string, unknown>)
        : undefined,
    approvedLoanAmount: optionalNumber(raw.approvedLoanAmount),
    loanDisbursement:
      raw.loanDisbursement !== undefined &&
      raw.loanDisbursement !== null &&
      typeof raw.loanDisbursement === 'object'
        ? (raw.loanDisbursement as UserProductApplication['loanDisbursement'])
        : undefined,
    equityPayment:
      raw.equityPayment !== undefined &&
      raw.equityPayment !== null &&
      typeof raw.equityPayment === 'object'
        ? (raw.equityPayment as UserProductApplication['equityPayment'])
        : undefined,
    postApprovalFulfillment:
      raw.postApprovalFulfillment !== undefined &&
      raw.postApprovalFulfillment !== null &&
      typeof raw.postApprovalFulfillment === 'object'
        ? (raw.postApprovalFulfillment as UserProductApplication['postApprovalFulfillment'])
        : undefined,
    createdAt:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt ?? '')
  };
}
