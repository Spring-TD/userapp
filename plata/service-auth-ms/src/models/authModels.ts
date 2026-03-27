import mongoose, { Schema, Document } from 'mongoose';
import { UserAccount, UserType, AccountStatus } from './User';
import { Role, Permission } from './Role';
import { Invitation } from './Invitation';
import { ApiKey, ApiKeyStatus, ApiKeyEnvironment } from './ApiKey';
import { Session } from './Session';

// User Schema
export interface IUserDocument extends Omit<UserAccount, 'id'>, Document {
    id: string; // Mongoose virtual 'id'
}

const UserSchema = new Schema({
    _id: { type: String, required: true }, // We'll custom set this to uuid
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone: { type: String },
    user_type: { type: String, enum: Object.values(UserType), required: true },
    status: { type: String, enum: Object.values(AccountStatus), default: AccountStatus.PENDING },
    email_verified: { type: Boolean, default: false },
    phone_verified: { type: Boolean, default: false },
    user_merchant_id: { type: String },
    country: { type: String },
    callback_url: { type: String }, // specific to Merchant
    error_logs_url: { type: String }, // specific to Merchant
    role_id: { type: String }, // specific to User
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_login_at: { type: Date },
    deactivated_at: { type: Date },
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: { type: Date }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for id
UserSchema.virtual('id').get(function () {
    return this._id;
});

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);

// Role Schema
export interface IRoleDocument extends Omit<Role, 'id'>, Document {
    id: string;
}

const RoleSchema = new Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String, enum: Object.values(Permission) }],
    merchant_id: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

RoleSchema.virtual('id').get(function () {
    return this._id;
});

export const RoleModel = mongoose.model<IRoleDocument>('Role', RoleSchema);

// Invitation Schema
export interface IInvitationDocument extends Omit<Invitation, 'id'>, Document {
    id: string;
}

const InvitationSchema = new Schema({
    _id: { type: String, required: true },
    email: { type: String, required: true },
    roleId: { type: String, required: true },
    merchantId: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

InvitationSchema.virtual('id').get(function () {
    return this._id;
});

export const InvitationModel = mongoose.model<IInvitationDocument>('Invitation', InvitationSchema);

// ApiKey Schema
export interface IApiKeyDocument extends Omit<ApiKey, 'id'>, Document {
    id: string;
}

const ApiKeySchema = new Schema({
    _id: { type: String, required: true },
    merchant_id: { type: String, required: true },
    name: { type: String, required: true },
    public_key: { type: String, required: true, unique: true },
    // Raw secret key is required for the frontend toggle UX.
    // Kept as non-required for backward compatibility with older stored keys.
    secret_key: { type: String, required: false },
    secret_key_hash: { type: String, required: false },
    environment: { type: String, enum: Object.values(ApiKeyEnvironment), required: true },
    status: { type: String, enum: Object.values(ApiKeyStatus), default: ApiKeyStatus.ACTIVE },
    permissions: [{ type: String }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_used_at: { type: Date },
    expires_at: { type: Date }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

ApiKeySchema.virtual('id').get(function () {
    return this._id;
});

export const ApiKeyModel = mongoose.model<IApiKeyDocument>('ApiKey', ApiKeySchema);

// Session Schema
export interface ISessionDocument extends Omit<Session, 'id'>, Document {
    id: string;
}

const SessionSchema = new Schema({
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    refreshToken: { type: String, required: true, unique: true },
    deviceInfo: { type: String },
    ipAddress: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    isValid: { type: Boolean, default: true }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

SessionSchema.virtual('id').get(function () {
    return this._id;
});

export const SessionModel = mongoose.model<ISessionDocument>('Session', SessionSchema);
