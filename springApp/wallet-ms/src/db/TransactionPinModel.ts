import mongoose, { Document, Schema } from 'mongoose';

/**
 * User-scoped transaction PIN. A user has at most one PIN regardless of how many
 * wallets they own, so this is keyed by `userId` (the auth/JWT userId), not by
 * walletId. The PIN gates money-out operations (transfer, bank payout).
 */
export interface ITransactionPinDoc extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  /** scrypt hash, formatted `salt:derivedKey` (see utils/transactionPin). */
  pinHash: string;
  failedAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionPinSchema = new Schema<ITransactionPinDoc>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    pinHash: { type: String, required: true },
    failedAttempts: { type: Number, required: true, default: 0 },
    lockedUntil: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model<ITransactionPinDoc>('TransactionPin', TransactionPinSchema);
