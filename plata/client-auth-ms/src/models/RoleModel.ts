import mongoose, { Schema, Document } from 'mongoose';
import { Permission, Role } from './User';

export interface RoleDocument extends Omit<Role, 'id'>, Document { }

const roleSchema = new Schema<RoleDocument>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        permissions: {
            type: [String],
            enum: Object.values(Permission),
            required: true,
            default: [],
        },
        merchant_id: { type: String, required: true },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// A role name should be unique within a merchant's scope
roleSchema.index({ merchant_id: 1, name: 1 }, { unique: true });

export const RoleModel = mongoose.model<RoleDocument>('Role', roleSchema);
