import mongoose, { Schema, Document } from 'mongoose';
import { ContractStatus } from '../types/contract';

export interface IContract extends Document {
  title: string;
  description: string;
  type: string;
  status: ContractStatus;
  content: string;
  parties: Array<{
    userId: string;
    role: string;
    name?: string;
    email?: string;
  }>;
  createdBy: string;
  version: number;
  signatures: Array<{
    userId: string;
    signature: string;
    signedAt: Date;
  }>;
  startDate?: Date;
  endDate?: Date;
  terms?: Record<string, any>;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContractSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    type: {
      type: String,
      required: true,
      default: 'standard',
      enum: ['standard', 'nda', 'employment', 'service', 'partnership', 'other']
    },
    status: {
      type: String,
      required: true,
      default: ContractStatus.DRAFT,
      enum: Object.values(ContractStatus)
    },
    content: {
      type: String,
      required: true
    },
    parties: [
      {
        userId: {
          type: String,
          required: true
        },
        role: {
          type: String,
          required: true
        },
        name: String,
        email: String
      }
    ],
    createdBy: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      default: 1
    },
    signatures: [
      {
        userId: {
          type: String,
          required: true
        },
        signature: {
          type: String,
          required: true
        },
        signedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    startDate: Date,
    endDate: Date,
    terms: {
      type: Schema.Types.Mixed,
      default: {}
    },
    attachments: [String]
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
ContractSchema.index({ createdBy: 1 });
ContractSchema.index({ status: 1 });
ContractSchema.index({ type: 1 });
ContractSchema.index({ 'parties.userId': 1 });

export const ContractModel = mongoose.model<IContract>('Contract', ContractSchema);
