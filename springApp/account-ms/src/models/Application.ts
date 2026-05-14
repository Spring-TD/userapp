import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
    userId: string;
    productId: string;
    productName: string;
    productType: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLACKLISTED';
    rejectionReason?: string;
    blacklistReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema({
    userId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productType: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLACKLISTED'],
        default: 'PENDING',
        index: true
    },
    rejectionReason: { type: String },
    blacklistReason: { type: String },
}, {
    timestamps: true
});

export default mongoose.model<IApplication>('Application', ApplicationSchema);
