import mongoose, { Schema, Document } from 'mongoose';
import { Invitation } from './User';

export interface InvitationDocument extends Document {
    email: string;
    roleId: string;
    merchantId: string;
    token: string;
    status: 'pending' | 'accepted' | 'expired';
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const invitationSchema = new Schema<InvitationDocument>(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        roleId: { type: String, required: true },
        merchantId: { type: String, required: true },
        token: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'expired'],
            required: true,
            default: 'pending',
        },
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true, // createdAt / updatedAt (camelCase to match Invitation interface)
    }
);

// Automatically remove expired invitation documents from MongoDB
invitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Prevent duplicate pending invitations for the same email within a merchant
invitationSchema.index({ merchantId: 1, email: 1, status: 1 });

export const InvitationModel = mongoose.model<InvitationDocument>('Invitation', invitationSchema);
