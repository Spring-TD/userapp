import mongoose, { Schema, Document } from 'mongoose';
import { DriveDocument } from '../types/app';

interface IDriveDocument extends Omit<DriveDocument, 'id'>, Document { }

const DriveSchema: Schema = new Schema({
    appId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    url: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    uploadedAt: { type: String, default: () => new Date().toISOString() },
    metadata: { type: Schema.Types.Mixed }
}, {
    timestamps: false,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret: Record<string, unknown>) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    },
    toObject: {
        virtuals: true
    }
});

export const DriveMongoModel = mongoose.model<IDriveDocument>('DriveDocument', DriveSchema);
