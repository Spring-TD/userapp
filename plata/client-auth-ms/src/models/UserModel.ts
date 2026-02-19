import mongoose, { Schema, Document } from 'mongoose';
import { UserType, AccountStatus, UserAccount } from './User';

export interface UserDocument extends Omit<UserAccount, 'id'>, Document { }

const userSchema = new Schema<UserDocument>(
    {
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        first_name: { type: String, required: true },
        last_name: { type: String, required: true },
        phone: { type: String },
        user_type: {
            type: String,
            enum: Object.values(UserType),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(AccountStatus),
            required: true,
        },
        email_verified: { type: Boolean, required: true, default: false },
        phone_verified: { type: Boolean, required: true, default: false },
        user_merchant_id: { type: String },
        country: { type: String },
        role_id: { type: String },
        callback_url: { type: String },
        error_logs_url: { type: String },
        last_login_at: { type: Date },
        deactivated_at: { type: Date, default: null },
        failed_login_attempts: { type: Number, default: 0 },
        locked_until: { type: Date },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// Useful index for merchant-scoped queries
userSchema.index({ user_merchant_id: 1, user_type: 1 });

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
