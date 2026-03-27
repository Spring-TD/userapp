import mongoose, { Schema, Document } from 'mongoose';
import {
    Service,
    Credential,
    IPWhitelist,
    ServiceStatus,
    CredentialStatus,
    CredentialType
} from '../types/samsTypes';

// Service Schema
export interface IServiceDocument extends Omit<Service, 'service_id'>, Document {
    service_id: string;
}

const ServiceSchema = new Schema({
    service_id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    description: { type: String },
    version: { type: String },
    endpoint_url: { type: String },
    health_check_url: { type: String },
    status: { type: String, enum: Object.values(ServiceStatus), default: ServiceStatus.ACTIVE },
    owner_email: { type: String },
    tags: [{ type: String }],
    metadata: { type: Map, of: String },
    user_merchant_id: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String }
});

export const ServiceModelMongo = mongoose.model<IServiceDocument>('Service', ServiceSchema);

// Credential Schema
export interface ICredentialDocument extends Omit<Credential, 'credential_id'>, Document {
    credential_id: string;
}

const CredentialSchema = new Schema({
    credential_id: { type: String, required: true, unique: true },
    service_id: { type: String, required: true },
    target_service_id: { type: String },
    user_merchant_id: { type: String },
    credential_type: { type: String, enum: Object.values(CredentialType), required: true },
    credential_value: { type: String, required: true },
    credential_hash: { type: String }, // Store the hash if provided/generated
    permissions: [{ type: String }],
    expires_at: { type: Date },
    rate_limit: { type: Number },
    status: { type: String, enum: Object.values(CredentialStatus), default: CredentialStatus.ACTIVE },
    last_used_at: { type: Date },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String }
});

export const CredentialModelMongo = mongoose.model<ICredentialDocument>('Credential', CredentialSchema);

// IP Whitelist Schema
export interface IIPWhitelistDocument extends Omit<IPWhitelist, 'id'>, Document {
    id: string;
}

const IPWhitelistSchema = new Schema({
    id: { type: String, required: true, unique: true },
    service_id: { type: String, required: true },
    ip_address: { type: String, required: true },
    ip_range: { type: String },
    description: { type: String },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    created_by: { type: String }
});

export const IPWhitelistModelMongo = mongoose.model<IIPWhitelistDocument>('IPWhitelist', IPWhitelistSchema);
