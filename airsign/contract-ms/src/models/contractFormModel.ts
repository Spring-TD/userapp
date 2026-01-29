import mongoose, { Schema, Document } from 'mongoose';
import { ContractTypeEnum } from '../types/contractType';

export interface IContractTo {
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  user_id: string;
}

export interface IContractFrom {
  partyType: 'individual' | 'business';
  fullName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  designation: string; // Required for Agreement contracts
  // Business-specific fields (required when partyType = 'business')
  businessName?: string;
  businessAddress?: string;
  businessEmail?: string;
  businessPhone?: string;
  signature?: string; // URL or base64 of uploaded signature - ONLY for Agreement & Indemnity
  facialCapture?: string; // URL or base64 of facial capture - ONLY for Agreement & Indemnity
  companyLogo?: string; // URL or base64 of company logo
}

export interface IContractForm extends Document {
  contractOrderId: string; // Reference to the contract order
  contract_from?: IContractFrom; // Optional for Indemnity when contract_to is present
  contract_to?: IContractTo; // From the contract order
  contractName: string;
  contractDescription: string;
  contractContent: string; // Rich text editor formatted content
  contractType: ContractTypeEnum;
  createdBy: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  // Methods
  validateSignature(): boolean;
}

const ContractToSchema = new Schema({
  fullName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  user_id: {
    type: String,
    required: true
  }
}, { _id: false });

const ContractFromSchema = new Schema({
  partyType: {
    type: String,
    required: true,
    enum: ['individual', 'business']
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  address: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  designation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  // Business-specific fields
  businessName: {
    type: String,
    trim: true,
    maxlength: 300
  },
  businessAddress: {
    type: String,
    trim: true,
    maxlength: 500
  },
  businessEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid business email address']
  },
  businessPhone: {
    type: String,
    trim: true,
    maxlength: 50
  },
  signature: {
    type: String,
    trim: true
    // Optional field - REQUIRED for Agreement and Indemnity contract types
    // Disclaimer and Terms & Condition types do NOT include signature
  },
  facialCapture: {
    type: String,
    trim: true
    // Optional field - REQUIRED for Agreement and Indemnity contract types
    // Disclaimer and Terms & Condition types do NOT include facialCapture
  },
  companyLogo: {
    type: String,
    trim: true
  }
}, { _id: false });

const ContractFormSchema: Schema = new Schema(
  {
    contractOrderId: {
      type: String,
      required: true,
      index: true
    },
    contract_from: {
      type: ContractFromSchema,
      required: false // Optional for Indemnity when contract_to is present
    },
    contract_to: {
      type: ContractToSchema,
      required: false
    },
    contractName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    contractDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    contractContent: {
      type: String,
      required: true
    },
    contractType: {
      type: String,
      required: true,
      enum: Object.values(ContractTypeEnum)
    },
    createdBy: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected'],
      default: 'draft'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
ContractFormSchema.index({ contractOrderId: 1 });
ContractFormSchema.index({ createdBy: 1, status: 1 });
ContractFormSchema.index({ contractType: 1 });
ContractFormSchema.index({ 'contract_from.email': 1 });

// Virtual field to check if signature is required based on contract type
ContractFormSchema.virtual('requiresSignature').get(function() {
  return this.contractType === ContractTypeEnum.AGREEMENT || 
         this.contractType === ContractTypeEnum.INDEMNITY;
});

// Validation method
ContractFormSchema.methods.validateSignature = function(): boolean {
  if (this.requiresSignature && (!this.contract_from.signature || !this.contract_from.facialCapture)) {
    return false;
  }
  return true;
};

export const ContractFormModel = mongoose.model<IContractForm>('ContractForm', ContractFormSchema);
