import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  session_id: string; // application-provided id (e.g. uuid) for lookups
  userId: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

const SessionSchema = new Schema<ISession>({
  session_id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  refreshToken: { type: String, required: true, index: true },
  deviceInfo: { type: String },
  ipAddress: { type: String },
  lastActiveAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  isValid: { type: Boolean, required: true, default: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model<ISession>('Session', SessionSchema);
