import mongoose, { Schema, Document } from 'mongoose';
import { ContractTypeEnum } from '../types/contractType';

export interface IContractTo {
  fullName?: string;
  email: string;
  phone?: string;
  address?: string;
  user_id: string;
}

export interface IContractOrder extends Document {
  contract_to?: IContractTo;
  contract_id: string;
  contract_reference: string; // Unique human-readable reference code
  contract_type: ContractTypeEnum;
  contract_content?: string; // Contract content/template
  expiration: Date;
  redirect_url?: string;
  contract_url: string;
  createdBy: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
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

const ContractOrderSchema: Schema = new Schema(
  {
    contract_to: {
      type: ContractToSchema,
      required: false
    },
    contract_id: {
      type: String,
      required: true,
      index: true
    },
    contract_reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true
    },
    contract_type: {
      type: String,
      required: true,
      enum: Object.values(ContractTypeEnum),
      index: true
    },
    contract_content: {
      type: String,
      trim: true
    },
    expiration: {
      type: Date,
      required: true,
      index: true
    },
    redirect_url: {
      type: String,
      trim: true
    },
    contract_url: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
ContractOrderSchema.index({ createdBy: 1, status: 1 });
ContractOrderSchema.index({ contract_type: 1, status: 1 });
ContractOrderSchema.index({ 'contract_to.email': 1 });
ContractOrderSchema.index({ expiration: 1 });

// Method to check if order is expired
ContractOrderSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiration;
};

// Pre-save hook to auto-update status if expired
ContractOrderSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

export const ContractOrderModel = mongoose.model<IContractOrder>('ContractOrder', ContractOrderSchema);
