import mongoose, { Document, Schema } from 'mongoose';

export interface IInvitation extends Document {
  _id: mongoose.Types.ObjectId;
  invitation_id: string; // application-provided id (e.g. uuid) for lookups
  email: string;
  roleId: string;
  merchantId: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  invitation_id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  roleId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, required: true, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);
