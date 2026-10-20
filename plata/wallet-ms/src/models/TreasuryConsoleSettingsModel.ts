import mongoose, { Schema, type Document } from 'mongoose';

export type TreasurySettlementMode = 'manual' | 'automatic';

export type TreasurySettlementType = 'investments' | 'commodities' | 'savings';

export interface ITreasuryConsoleSettingsDocument extends Document {
  merchantId: string;
  appId: string;
  settlementType: TreasurySettlementType;
  mode: TreasurySettlementMode;
  revertedToManual: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const treasuryConsoleSettingsSchema = new Schema<ITreasuryConsoleSettingsDocument>(
  {
    merchantId: { type: String, required: true, index: true },
    appId: { type: String, required: true, index: true },
    settlementType: {
      type: String,
      enum: ['investments', 'commodities', 'savings'],
      required: true
    },
    mode: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
    revertedToManual: { type: Boolean, default: false }
  },
  { timestamps: true }
);

treasuryConsoleSettingsSchema.index(
  { merchantId: 1, appId: 1, settlementType: 1 },
  { unique: true }
);

export const TreasuryConsoleSettingsModel =
  mongoose.models.TreasuryConsoleSettings ||
  mongoose.model<ITreasuryConsoleSettingsDocument>(
    'TreasuryConsoleSettings',
    treasuryConsoleSettingsSchema
  );
