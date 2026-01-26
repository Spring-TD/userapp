
export enum ApiKeyStatus {
    ACTIVE = 'active',
    REVOKED = 'revoked',
    EXPIRED = 'expired'
}

export enum ApiKeyEnvironment {
    TEST = 'test',
    LIVE = 'live'
}

export interface ApiKey {
    id: string;
    merchant_id: string;
    name: string;
    public_key: string;
    secret_key_hash: string; // We only store the hash of the secret key
    environment: ApiKeyEnvironment;
    status: ApiKeyStatus;
    permissions?: string[]; // Optional: restrict key to specific permissions
    created_at: Date;
    updated_at: Date;
    last_used_at?: Date;
    expires_at?: Date;
}

export interface CreateApiKeyRequest {
    name: string;
    environment: ApiKeyEnvironment;
    permissions?: string[];
    expires_in_days?: number;
}
