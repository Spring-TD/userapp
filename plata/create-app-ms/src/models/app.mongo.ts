import mongoose, { Schema, Document } from 'mongoose';
import { App } from '../types/app';

interface IAppDocument extends Omit<App, 'id'>, Document {
    // Mongoose handles _id, and the id virtual will be available
}

const AppSchema = new Schema<IAppDocument>({
    name: { type: String, required: true },
    websiteUrl: { type: String, required: true },
    alias: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    merchantId: { type: String, required: true },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected', 'incomplete'],
        default: 'draft'
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    submittedAt: { type: String },
    approvedAt: { type: String },
    rejectedAt: { type: String },
    rejectionReason: { type: String },
    productKeys: { type: [String], default: [] }
}, {
    timestamps: false, // We use custom createdAt/updatedAt strings to match interface
    toJSON: {
        virtuals: true,
        transform: function (doc, ret: any) {
            if (ret._id) {
                ret.id = ret._id;
                delete ret._id;
            }
            if (ret.__v !== undefined) {
                delete ret.__v;
            }
        }
    },
    toObject: {
        virtuals: true
    }
});

// Update updatedAt on save (Mongoose 9: no next, use async or sync return)
AppSchema.pre<IAppDocument>('save', function () {
    this.updatedAt = new Date().toISOString();
    if (this.isNew && !this.createdAt) {
        this.createdAt = new Date().toISOString();
    }
});

export const AppMongoModel = mongoose.model<IAppDocument>('App', AppSchema);
