
export interface Session {
    id: string;
    userId: string;
    refreshToken: string;
    deviceInfo?: string; // e.g., "Chrome on MacBook Pro"
    ipAddress?: string;
    lastActiveAt: Date;
    createdAt: Date;
    expiresAt: Date;
    isValid: boolean;
}
