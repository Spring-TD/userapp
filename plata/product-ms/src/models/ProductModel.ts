import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Product } from '../types/product';
import { coerceStoredProductType, PRODUCT_DISCRIMINATORS } from '../utils/productType';
import { computeProductConfigCalculations } from '../utils/productConfigCalculations';

export interface IProductDocument extends Omit<Product, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const loanLoanTypeItemSchema = new Schema(
  {
    name: { type: String },
    description: { type: String }
  },
  { _id: false }
);

const loanAboutSchema = new Schema(
  {
    tenure: { type: Schema.Types.Mixed },
    duration: { type: Schema.Types.Mixed },
    loanTypes: { type: [loanLoanTypeItemSchema], default: undefined },
    mortgageTypes: { type: [loanLoanTypeItemSchema], default: undefined },
    savingsTypes: { type: [loanLoanTypeItemSchema], default: undefined },
    investmentTypes: { type: [loanLoanTypeItemSchema], default: undefined },
    commodityTypes: { type: [loanLoanTypeItemSchema], default: undefined },
    previewAssetUrl: { type: String }
  },
  { _id: false }
);

const loanStructureTabSchema = new Schema(
  {
    interestRate: { type: Schema.Types.Mixed },
    interestMethod: { type: String },
    /** When false/undefined, loan engines should not apply moratorium even if `moratorium` is set. */
    allowMoratorium: { type: Boolean },
    /** Type of moratorium — use `GET /options/moratorium-type` values. */
    moratoriumType: { type: String },
    moratorium: { type: Schema.Types.Mixed },
    repaymentWorkflow: { type: String },
    loanAmount: {
      min: { type: Number },
      max: { type: Number }
    },
    /** `GET /options/repayment-schedule` values. */
    repaymentSchedule: { type: String },
    amortizationSchedule: { type: String },
    /** Often `GET /options/repayment-cycle` values. */
    repaymentFrequency: { type: String },
    /** Days until NPA; `GET /options/acceptable-npa` values (stored as string, e.g. `"90"`). */
    acceptableNPA: { type: String },
    /** `GET /options/equity-requirement` values. */
    equityRequirement: { type: String }
  },
  { _id: false }
);

const loanSecuritySchema = new Schema(
  {
    acceptCheque: { type: Boolean },
    realEstateProperties: { type: Boolean },
    otherProperties: { type: Boolean },
    guarantor: { type: Boolean },
    bankGuarantee: { type: Boolean },
    savingsAccount: { type: Boolean },
    noSecurity: { type: Boolean }
  },
  { _id: false }
);

const loanDocumentItemSchema = new Schema(
  {
    name: { type: String },
    fileUrl: { type: String }
  },
  { _id: false }
);

const loanOtherRequirementItemSchema = new Schema(
  {
    requirementType: { type: String },
    /** `GET /options/loan-other-requirement-content-type` values. */
    contentType: { type: String },
    description: { type: String },
    templateFileUrl: { type: String },
    uploadRequired: { type: Boolean }
  },
  { _id: false }
);

const loanRequirementsSchema = new Schema(
  {
    security: { type: loanSecuritySchema },
    documentsToDownload: { type: [loanDocumentItemSchema], default: undefined },
    otherRequirements: { type: [loanOtherRequirementItemSchema], default: undefined },
    contractId: { type: String },
    airSignSecretKey: { type: String },
    airSignUid: { type: String }
  },
  { _id: false }
);

const loanFeeItemSchema = new Schema(
  {
    name: { type: String },
    /** `GET /options/fee-type` — `Flat` | `Percent`. */
    feeType: { type: String },
    value: { type: String }
  },
  { _id: false }
);

const loanPenaltyItemSchema = new Schema(
  {
    name: { type: String },
    /** `GET /options/penalty-type` (same as fee-type). */
    penaltyType: { type: String },
    value: { type: String },
    triggerDurationDays: { type: Number }
  },
  { _id: false }
);

const loanLateRepaymentSchema = new Schema(
  {
    enabled: { type: Boolean },
    penalties: { type: [loanPenaltyItemSchema], default: undefined }
  },
  { _id: false }
);

const loanFeesAndChargesSchema = new Schema(
  {
    fees: { type: [loanFeeItemSchema], default: undefined },
    deductAllChargesOnLoan: { type: Boolean },
    customerPaysChargesBeforeDisbursement: { type: Boolean },
    lateRepayment: { type: loanLateRepaymentSchema },
    chargeForForcefulWithdrawal: { type: Boolean },
    forcefulWithdrawalPenalties: { type: [loanPenaltyItemSchema], default: undefined },
    contractId: { type: String },
    airSignSecretKey: { type: String },
    airSignUid: { type: String }
  },
  { _id: false }
);

const savingsStructureTabSchema = new Schema(
  {
    interestRate: { type: Schema.Types.Mixed },
    /** `GET /options/savings-interest-method` — `fixed_amount` | `reducing_balance`. */
    interestMethod: { type: String },
    /** `GET /options/savings-type` — `fixed_savings` | `flexible_savings`. */
    savingsType: { type: String },
    /** `GET /options/withdrawal-flexibility`. */
    withdrawalFlexibility: { type: String },
    savingsAmount: {
      min: { type: Number },
      max: { type: Number }
    },
    savingsTermsAndCondition: { type: String },
    contractId: { type: String },
    airSignSecretKey: { type: String },
    airSignUid: { type: String }
  },
  { _id: false }
);

const loanDiscriminatorSchema = new Schema(
  {
    about: { type: loanAboutSchema },
    structure: { type: loanStructureTabSchema },
    requirements: { type: loanRequirementsSchema },
    feesAndCharges: { type: loanFeesAndChargesSchema }
  },
  { _id: false, id: false }
);

const mortgagePropertyItemSchema = new Schema(
  {
    name: { type: String },
    propertyType: { type: String },
    value: { type: Schema.Types.Mixed },
    location: { type: String },
    propertyDescription: { type: String },
    facilities: { type: [String], default: undefined },
    customFacilities: { type: [String], default: undefined },
    imageUrls: { type: [String], default: undefined },
    videoUrl: { type: String }
  },
  { _id: false }
);

const mortgageDiscriminatorSchema = new Schema(
  {
    about: { type: loanAboutSchema },
    structure: { type: loanStructureTabSchema },
    requirements: { type: loanRequirementsSchema },
    feesAndCharges: { type: loanFeesAndChargesSchema },
    properties: { type: [mortgagePropertyItemSchema], default: undefined },
    equityContribution: { type: Number },
    propertyValue: { type: Number }
  },
  { _id: false, id: false }
);

const savingsDiscriminatorSchema = new Schema(
  {
    about: { type: loanAboutSchema },
    structure: { type: savingsStructureTabSchema },
    feesAndCharges: { type: loanFeesAndChargesSchema }
  },
  { _id: false, id: false }
);

const investmentStructureTabSchema = new Schema(
  {
    returnsOnInvestment: { type: Schema.Types.Mixed },
    interestMethod: { type: String },
    investmentType: { type: String },
    /** `GET /options/withdrawal-flexibility`. */
    withdrawalFlexibility: { type: String },
    investmentAmount: {
      min: { type: Number },
      max: { type: Number }
    },
    investmentTermsAndCondition: { type: String },
    enableUnitInvestmentPurchase: { type: Boolean },
    moratorium: { type: Schema.Types.Mixed },
    unitAmount: {
      amount: { type: Schema.Types.Mixed },
      minQuantity: { type: Number }
    }
  },
  { _id: false }
);

const investmentDiscriminatorSchema = new Schema(
  {
    about: { type: loanAboutSchema },
    structure: { type: investmentStructureTabSchema },
    feesAndCharges: { type: loanFeesAndChargesSchema }
  },
  { _id: false, id: false }
);

const commodityStructureTabSchema = new Schema(
  {
    yieldMethod: { type: String },
    offerYieldEnabled: { type: Boolean },
    offerYield: { type: Schema.Types.Mixed },
    unitAmount: { type: Schema.Types.Mixed },
    /** `GET /options/withdrawal-flexibility`. */
    withdrawalFlexibility: { type: String },
    minQuantityPurchase: { type: Number },
    maxAmount: { type: Number },
    commodityTermsAndCondition: { type: String },
    moratorium: { type: Schema.Types.Mixed },
    contractId: { type: String },
    airSignSecretKey: { type: String },
    airSignUid: { type: String }
  },
  { _id: false }
);

const commodityPriceEntrySchema = new Schema(
  {
    price: { type: Schema.Types.Mixed },
    date: { type: String },
    source: { type: String }
  },
  { _id: false }
);

const commodityDiscriminatorSchema = new Schema(
  {
    about: { type: loanAboutSchema },
    structure: { type: commodityStructureTabSchema },
    feesAndCharges: { type: loanFeesAndChargesSchema },
    commodityPrices: { type: [commodityPriceEntrySchema], default: undefined },
    /** Legacy top-level fields (optional; prefer structure / commodityPrices for new UIs) */
    price: { type: Number },
    minimumQuantity: { type: Number },
    unitOfMeasure: { type: String },
    config: { type: Schema.Types.Mixed }
  },
  { _id: false, id: false }
);

const baseProductSchema = new Schema<IProductDocument>(
  {
    referenceNumber: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true, default: '' },
    isActive: { type: Boolean, default: true },
    type: { type: String, required: true, enum: PRODUCT_DISCRIMINATORS },
    subType: { type: String },
    appId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['complete', 'incomplete'],
      default: 'incomplete'
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { discriminatorKey: 'type', collection: 'products', timestamps: false }
);

let ProductModel: Model<IProductDocument>;
if (mongoose.models.Product) {
  ProductModel = mongoose.models.Product as Model<IProductDocument>;
} else {
  ProductModel = mongoose.model<IProductDocument>('Product', baseProductSchema);
  ProductModel.discriminator('LOAN', loanDiscriminatorSchema);
  ProductModel.discriminator('MORTGAGE', mortgageDiscriminatorSchema);
  ProductModel.discriminator('SAVINGS', savingsDiscriminatorSchema);
  ProductModel.discriminator('INVESTMENT', investmentDiscriminatorSchema);
  ProductModel.discriminator('COMMODITY', commodityDiscriminatorSchema);
}

export { ProductModel };

export function toProduct(doc: IProductDocument | Record<string, unknown>): Product {
  const o =
    doc && typeof (doc as IProductDocument).toObject === 'function'
      ? (doc as IProductDocument).toObject()
      : (doc as Record<string, unknown>);
  const raw = o as Record<string, unknown>;
  const typeRaw = String(raw.type ?? '');

  const product: Product = {
    id: (raw._id ?? (doc as IProductDocument)?._id)?.toString?.() ?? '',
    referenceNumber: raw.referenceNumber as string,
    name: raw.name as string,
    description: (raw.description as string) ?? '',
    type: coerceStoredProductType(typeRaw),
    appId: raw.appId as string,
    status: (raw.status as Product['status']) ?? 'incomplete',
    isActive: raw.isActive !== false && raw.isActive !== 0,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
    subType: raw.subType as string | undefined,
    metadata:
      raw.metadata !== undefined && raw.metadata !== null && typeof raw.metadata === 'object'
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
    structure:
      raw.structure !== undefined && raw.structure !== null && typeof raw.structure === 'object'
        ? (raw.structure as Product['structure'])
        : undefined,
    about:
      raw.about !== undefined && raw.about !== null && typeof raw.about === 'object'
        ? (raw.about as Product['about'])
        : undefined,
    requirements:
      raw.requirements !== undefined && raw.requirements !== null && typeof raw.requirements === 'object'
        ? (raw.requirements as Product['requirements'])
        : undefined,
    feesAndCharges:
      raw.feesAndCharges !== undefined && raw.feesAndCharges !== null && typeof raw.feesAndCharges === 'object'
        ? (raw.feesAndCharges as Product['feesAndCharges'])
        : undefined,
    properties:
      raw.properties !== undefined && Array.isArray(raw.properties)
        ? (raw.properties as Product['properties'])
        : undefined,
    config:
      raw.config !== undefined && raw.config !== null && typeof raw.config === 'object'
        ? (raw.config as Product['config'])
        : undefined,
    equityContribution: raw.equityContribution as number | undefined,
    propertyValue: raw.propertyValue as number | undefined,
    price: raw.price as number | undefined,
    minimumQuantity: raw.minimumQuantity as number | undefined,
    unitOfMeasure: raw.unitOfMeasure as string | undefined,
    commodityPrices:
      raw.commodityPrices !== undefined && Array.isArray(raw.commodityPrices)
        ? (raw.commodityPrices as Product['commodityPrices'])
        : undefined
  };

  product.calculatedConfig = computeProductConfigCalculations(product);
  return product;
}
