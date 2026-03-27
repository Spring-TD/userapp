
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
    // Raw secret key. This is returned to the frontend so it can toggle show/hide.
    // NOTE: This increases blast radius if the API is exposed; consider encrypting at rest for production.
    secret_key: string;
    // Kept optional for backward compatibility with previously stored keys.
    secret_key_hash?: string;
    environment: ApiKeyEnvironment;
    status: ApiKeyStatus;
    permissions?: string[]; // Optional: restrict key to specific permissions
    created_at: Date;
    updated_at: Date;
    last_used_at?: Date;
    expires_at?: Date;
}

export interface CreateApiKeyRequest {
    name?: string;
    environment?: ApiKeyEnvironment;
    permissions?: string[];
    expires_in_days?: number;
}
