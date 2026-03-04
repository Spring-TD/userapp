import mongoose, { Document, Schema } from 'mongoose';
import { ApiKeyStatus, ApiKeyEnvironment } from '../models/ApiKey';

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  key_id: string; // application-provided id (e.g. uuid) for lookups
  merchant_id: string;
  name: string;
  public_key: string;
  secret_key_hash: string;
  environment: string;
  status: string;
  permissions?: string[];
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
  expires_at?: Date;
}

const ApiKeySchema = new Schema<IApiKey>({
  key_id: { type: String, required: true, unique: true, index: true },
  merchant_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  public_key: { type: String, required: true, unique: true },
  secret_key_hash: { type: String, required: true },
  environment: { type: String, required: true, enum: Object.values(ApiKeyEnvironment) },
  status: { type: String, required: true, enum: Object.values(ApiKeyStatus), default: ApiKeyStatus.ACTIVE },
  permissions: { type: [String], default: [] },
  last_used_at: { type: Date },
  expires_at: { type: Date }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
