import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  permissions: string[];
  merchant_id: string;
  created_at: Date;
  updated_at: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    permissions: { type: [String], required: true, default: [] },
    merchant_id: { type: String, required: true, index: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<IRole>('Role', RoleSchema);
