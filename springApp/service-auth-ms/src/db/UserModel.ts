import mongoose, { Document, Schema } from 'mongoose';
import { UserType, AccountStatus } from '../models/User';

export interface IUserAccount extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type: string;
  status: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  deactivated_at?: Date | null;
  failed_login_attempts: number;
  locked_until?: Date;
  user_merchant_id: string;
  country: string;
  role_id?: string;
  callback_url?: string;
  error_logs_url?: string;
}

const UserAccountSchema = new Schema<IUserAccount>({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  phone: { type: String },
  user_type: { type: String, required: true, enum: Object.values(UserType) },
  status: { type: String, required: true, enum: Object.values(AccountStatus), default: AccountStatus.PENDING },
  email_verified: { type: Boolean, default: false },
  phone_verified: { type: Boolean, default: false },
  last_login_at: { type: Date },
  deactivated_at: { type: Date },
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: { type: Date },
  user_merchant_id: { type: String, required: true, index: true },
  country: { type: String, required: true },
  role_id: { type: String },
  callback_url: { type: String },
  error_logs_url: { type: String }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model<IUserAccount>('UserAccount', UserAccountSchema);
